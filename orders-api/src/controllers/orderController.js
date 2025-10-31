const orderService = require('../services/orderService');
const { 
    createOrderSchema, 
    idParamSchema,
    idempotencyHeaderSchema,
    listOrdersSchema
} = require('../validations/orderValidation');

/**
 * Controlador para crear una nueva orden
 */
async function handleCreateOrder(req, res) {
    try {
        // validar el body
        const { error, value } = createOrderSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'Datos de entrada inválidos.',
                details: error.details.map(d => d.message)
            });
        }

        // llamar al servicio
        const newOrder = await orderService.createOrder(value);
        
        // responder con éxito
        return res.status(201).json({
            status: 'success',
            message: 'Orden creada exitosamente.',
            data: newOrder
        });
        
    } catch (error) {
        // manejar errores específicos del servicio
        if (error.message === 'CLIENT_NOT_FOUND') {
            return res.status(404).json({ // 404 Not Found
                status: 'error',
                message: 'El cliente especificado no existe o no es válido.'
            });
        }
        if (error.message.startsWith('PRODUCT_NOT_FOUND')) {
            return res.status(404).json({ // 404 Not Found
                status: 'error',
                message: `El producto con ID ${error.message.split(': ')[1]} no existe.`
            });
        }
        if (error.message.startsWith('INSUFFICIENT_STOCK')) {
            return res.status(409).json({ // 409 Conflict
                status: 'error',
                message: `Stock insuficiente para el producto: ${error.message.split(': ')[1]}.`
            });
        }
        
        // error genérico
        console.error('Error en handleCreateOrder:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Error interno del servidor al procesar la orden.'
        });
    }
}

/**
 * Controlador para confirmar una orden.
 * Este controlador se ejecutará *después* del middleware de idempotencia.
 */
async function handleConfirmOrder(req, res) {
    try {
        const { id } = req.params;
        
        // llamar a la lógica de negocio
        const confirmedOrder = await orderService.confirmOrder(id);

        // guardar el resultado exitoso para el middleware de idempotencia
        // (El middleware necesita esta info para guardarla en la BDD)
        req.idempotencyResponse = {
            statusCode: 200,
            body: { status: 'success', data: confirmedOrder }
        };
        
        // responder
        return res.status(200).json(req.idempotencyResponse.body);
        
    } catch (error) {
        let statusCode = 500;
        let message = 'Error interno del servidor.';

        if (error.message === 'ORDER_NOT_FOUND') {
            statusCode = 404;
            message = 'La orden no fue encontrada.';
        }
        if (error.message === 'INVALID_ORDER_STATUS') {
            statusCode = 409; // conflicto
            message = 'La orden no se puede confirmar (estado inválido, ej: ya fue cancelada).';
        }

        // guardar el resultado fallido para el middleware
        req.idempotencyResponse = {
            statusCode,
            body: { status: 'error', message }
        };
        
        return res.status(statusCode).json(req.idempotencyResponse.body);
    }
}

/**
 * Controlador para obtener una orden por su ID
 */
async function handleGetOrderById(req, res) {
    try {
        // validar el ID
        const { error, value } = idParamSchema.validate(req.params);
        if (error) {
            return res.status(400).json({ status: 'error', message: 'ID de orden inválido.' });
        }

        // llamar al servicio
        const order = await orderService.getOrderById(value.id);

        // verificar si se encontró
        if (!order) {
            return res.status(404).json({ status: 'error', message: 'Orden no encontrada.' });
        }

        // responder con éxito
        return res.status(200).json({
            status: 'success',
            data: order
        });

    } catch (error) {
        console.error('Error en handleGetOrderById:', error);
        return res.status(500).json({ status: 'error', message: 'Error interno del servidor.' });
    }
}

/**
 * Controlador para listar y filtrar órdenes
 */
async function handleListOrders(req, res) {
    try {
        // validar la query string (req.query)
        const { error, value } = listOrdersSchema.validate(req.query);
        if (error) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'Parámetros de query inválidos.',
                details: error.details.map(d => d.message)
            });
        }
        
        // llamar al servicio
        const result = await orderService.listOrders(value);
        
        // responder
        return res.status(200).json({
            status: 'success',
            ...result
        });

    } catch (error) {
        console.error('Error en handleListOrders:', error);
        return res.status(500).json({ status: 'error', message: 'Error interno del servidor.' });
    }
}

/**
 * Controlador para cancelar una orden
 */
async function handleCancelOrder(req, res) {
    try {
        // validar el ID
        const { error, value } = idParamSchema.validate(req.params);
        if (error) {
            return res.status(400).json({ status: 'error', message: 'ID de orden inválido.' });
        }
        
        // llamar al servicio
        const canceledOrder = await orderService.cancelOrder(value.id);
        
        // responder con éxito
        return res.status(200).json({
            status: 'success',
            data: canceledOrder
        });

    } catch (error) {
        // manejar errores específicos del servicio
        let statusCode = 500;
        let message = 'Error interno del servidor.';

        if (error.message === 'ORDER_NOT_FOUND') {
            statusCode = 404;
            message = 'Orden no encontrada.';
        }
        
        if (error.message === 'CANCEL_WINDOW_EXPIRED') {
            statusCode = 409; // conflicto
            message = 'No se puede cancelar la orden: Ha pasado la ventana de 10 minutos.';
        }

        console.error('Error en handleCancelOrder:', error);
        return res.status(statusCode).json({
            status: 'error',
            message: message
        });
    }
}

module.exports = {
    handleCreateOrder,
    handleConfirmOrder,
    handleGetOrderById,
    handleListOrders,
    handleCancelOrder
};