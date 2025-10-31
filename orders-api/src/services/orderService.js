const pool = require('./db');
const apiClient = require('./apiClient');
const orderService = require('../services/orderService');
const { 
    createOrderSchema, 
    idParamSchema,
    idempotencyHeaderSchema
} = require('../validations/orderValidation');

/**
 * Crea una nueva orden, validando cliente y stock dentro de una transacción.
 */
async function createOrder({ customer_id, items }) {
    
    // validar al cliente ANTES de tocar la BDD
    const customer = await apiClient.validateCustomer(customer_id);
    if (!customer) {
        throw new Error('CLIENT_NOT_FOUND');
    }

    // iniciar conexión y transacción con la BDD
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
        // obtener productos y bloquear las filas para la transacción
        // (SELECT ... FOR UPDATE) es crucial para evitar que otro proceso
        // venda el mismo stock mientras calculamos.
        const productIds = items.map(item => item.product_id);
        const [products] = await connection.query(
            `SELECT * FROM products WHERE id IN (?) FOR UPDATE`,
            [productIds]
        );

        // validar stock y calcular totales
        let totalCents = 0;
        const orderItemsData = [];

        for (const item of items) {
            const product = products.find(p => p.id === item.product_id);

            // verificar si el producto existe
            if (!product) {
                throw new Error(`PRODUCT_NOT_FOUND: ${item.product_id}`);
            }
            // verificar stock
            if (product.stock < item.qty) {
                throw new Error(`INSUFFICIENT_STOCK: ${product.name}`);
            }
            
            const subtotal = product.price_cents * item.qty;
            totalCents += subtotal;

            orderItemsData.push({
                product_id: product.id,
                qty: item.qty,
                unit_price_cents: product.price_cents,
                subtotal_cents: subtotal,
                stock_restante: product.stock - item.qty
            });
        }

        // crear la orden (estado 'CREATED')
        const [orderResult] = await connection.query(
            `INSERT INTO orders (customer_id, status, total_cents) VALUES (?, ?, ?)`,
            [customer_id, 'CREATED', totalCents]
        );
        const orderId = orderResult.insertId;

        // insertar los items de la orden y actualizar el stock
        // Usamos Promise.all para ejecutar ambas tareas en paralelo
        
        // insertar items
        const orderItemsInsertQuery = `
            INSERT INTO order_items (order_id, product_id, qty, unit_price_cents, subtotal_cents) 
            VALUES ?
        `;
        const orderItemsValues = orderItemsData.map(item => [
            orderId, item.product_id, item.qty, item.unit_price_cents, item.subtotal_cents
        ]);
        await connection.query(orderItemsInsertQuery, [orderItemsValues]);

        // descontar stock (en lote)
        const updateStockPromises = orderItemsData.map(item => {
            return connection.query(
                `UPDATE products SET stock = ? WHERE id = ?`,
                [item.stock_restante, item.product_id]
            );
        });
        await Promise.all(updateStockPromises);

        // si todo salió bien, confirmar la transacción
        await connection.commit();
        
        // devolver la orden creada (consultándola fuera de la transacción si es necesario)
        return { 
            id: orderId, 
            status: 'CREATED', 
            customer_id, 
            total_cents: totalCents, 
            items: orderItemsData 
        };

    } catch (error) {
        // si algo falló, revertir la transacción
        await connection.rollback();
        
        // re-lanzar el error para que el controlador lo atrape
        console.error('Error en transacción de orden:', error.message);
        throw error;
        
    } finally {
        // siempre liberar la conexión
        connection.release();
    }
}

/**
 * Obtiene una orden por su ID, incluyendo sus items.
 */
async function getOrderById(orderId) {
    // usamos una transacción para asegurar que leemos la orden y sus items
    // de forma consistente.
    const connection = await pool.getConnection();
    try {
        const [orderRows] = await connection.query(
            `SELECT * FROM orders WHERE id = ?`,
            [orderId]
        );

        if (orderRows.length === 0) {
            return null;
        }

        const order = orderRows[0];

        const [itemRows] = await connection.query(
            `SELECT * FROM order_items WHERE order_id = ?`,
            [orderId]
        );
        
        order.items = itemRows;
        return order;

    } catch (error) {
        console.error('Error al obtener orden por ID:', error);
        throw new Error('Error en la base de datos al obtener la orden.');
    } finally {
        connection.release();
    }
}


/**
 * Confirma una orden, cambiando su estado de 'CREATED' a 'CONFIRMED'.
 * Esta función asume que la idempotencia ya fue manejada.
 * @returns {Promise<object>} - la orden actualizada.
 */
async function confirmOrder(orderId) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
        // obtener la orden y bloquearla
        const [rows] = await connection.query(
            `SELECT * FROM orders WHERE id = ? FOR UPDATE`,
            [orderId]
        );
        
        if (rows.length === 0) {
            throw new Error('ORDER_NOT_FOUND');
        }

        const order = rows[0];

        // lógica de negocio: Solo se puede confirmar si está 'CREATED'
        if (order.status === 'CONFIRMED') {
            // ya está confirmada, no es un error, solo devolvemos el estado actual.
            await connection.commit(); // liberar el bloqueo
            return getOrderById(orderId);
        }
        
        if (order.status !== 'CREATED') {
            throw new Error('INVALID_ORDER_STATUS');
        }

        // actualizar el estado
        await connection.query(
            `UPDATE orders SET status = 'CONFIRMED' WHERE id = ?`,
            [orderId]
        );

        // confirmar la transacción
        await connection.commit();
        
        // devolver la orden actualizada
        return getOrderById(orderId);

    } catch (error) {
        await connection.rollback();
        console.error('Error al confirmar la orden:', error);
        throw error; // re-lanzar para el controlador/middleware
    } finally {
        connection.release();
    }
}

/**
 * Lista, filtra y pagina órdenes usando paginación basada en cursor (ID).
 */
async function listOrders({ status, from, to, cursor, limit = 20 }) {
    try {
        let sql = `
            SELECT id, customer_id, status, total_cents, created_at 
            FROM orders 
            WHERE 1=1
        `;
        const params = {};
        
        // añadir filtros
        if (status) {
            sql += " AND status = :status";
            params.status = status;
        }
        if (from) {
            sql += " AND created_at >= :from";
            params.from = from;
        }
        if (to) {
            // Ajuste para que el 'to' incluya todo el día
            const toDate = new Date(to);
            toDate.setDate(toDate.getDate() + 1);
            sql += " AND created_at < :to";
            params.to = toDate.toISOString().split('T')[0];
        }

        // añadir filtro de cursor
        if (cursor) {
            sql += " AND id > :cursor";
            params.cursor = cursor;
        }

        // ordenar siempre por ID (necesario para el cursor)

        sql += " ORDER BY id ASC";

        // aplicar límite (limit + 1)
        const queryLimit = parseInt(limit, 10) + 1;
        sql += " LIMIT :limit";
        params.limit = queryLimit;

        // ejecutar la consulta
        const [rows] = await pool.query(sql, params);
        
        let nextCursor = null;

        // comprobar si hay una página siguiente
        if (rows.length === queryLimit) {
            rows.pop(); // Quitar el item extra
            nextCursor = rows[rows.length - 1].id;
        }

        return {
            data: rows,
            nextCursor
        };

    } catch (error) {
        console.error('Error al listar órdenes:', error);
        throw new Error('Error en la base de datos al listar las órdenes.');
    }
}

/**
 * Cancela una orden según las reglas de negocio,
 * restaurando el stock dentro de una transacción.
 */
async function cancelOrder(orderId) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
        // obtener la orden y bloquear la fila
        const [orderRows] = await connection.query(
            `SELECT * FROM orders WHERE id = ? FOR UPDATE`,
            [orderId]
        );

        if (orderRows.length === 0) {
            throw new Error('ORDER_NOT_FOUND');
        }

        const order = orderRows[0];

        // lógica de negocio, se puede cancelar?

        // si ya está cancelada, no hacer nada.
        if (order.status === 'CANCELED') {
            await connection.commit(); // liberar el bloqueo
            return getOrderById(orderId); // devolver el estado actual
        }

        // si está confirmada, chequear la regla de 10 minutos
        if (order.status === 'CONFIRMED') {
            const now = new Date();
            const createdAt = new Date(order.created_at);
            const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);

            if (diffMinutes > 10) {
                throw new Error('CANCEL_WINDOW_EXPIRED');
            }
        }
        
        // si la orden está 'CREATED' o 'CONFIRMED' (y dentro de la ventana),
        //    proceder a restaurar el stock.
        
        // obtener los items de la orden
        const [items] = await connection.query(
            `SELECT * FROM order_items WHERE order_id = ?`,
            [orderId]
        );

        // restaurar el stock de cada producto (en lote)
        if (items.length > 0) {
            const stockRestorePromises = items.map(item => {
                return connection.query(
                    `UPDATE products SET stock = stock + ? WHERE id = ?`,
                    [item.qty, item.product_id]
                );
            });
            await Promise.all(stockRestorePromises);
        }

        // actualizar el estado de la orden a 'CANCELED'
        await connection.query(
            `UPDATE orders SET status = 'CANCELED' WHERE id = ?`,
            [orderId]
        );

        // confirmar la transacción
        await connection.commit();
        
        // devolver la orden actualizada
        return getOrderById(orderId);

    } catch (error) {
        // si algo falló, revertir todo
        await connection.rollback();
        
        // re-lanzar el error para que el controlador lo atrape
        console.error('Error en transacción de cancelación:', error.message);
        throw error;
        
    } finally {
        // siempre liberar la conexión
        connection.release();
    }
}

module.exports = {
    createOrder,
    getOrderById,
    confirmOrder,
    listOrders,
    cancelOrder
};