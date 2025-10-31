const pool = require('./db');

/**
 * Crea un nuevo producto.
 */
async function createProduct({ sku, name, price_cents, stock }) {
    try {
        const sql = `
            INSERT INTO products (sku, name, price_cents, stock) 
            VALUES (:sku, :name, :price_cents, :stock)
        `;
        const [result] = await pool.query(sql, { sku, name, price_cents, stock });
        return { id: result.insertId, sku, name, price_cents, stock };
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            throw new Error('El SKU ya está registrado.');
        }
        console.error('Error al crear producto:', error);
        throw new Error('Error en la base de datos al crear el producto.');
    }
}

/**
 * Obtiene un producto por su ID.
 */
async function getProductById(id) {
    try {
        const sql = `SELECT * FROM products WHERE id = :id`;
        const [rows] = await pool.query(sql, { id });
        return rows[0] || null;
    } catch (error) {
        console.error('Error al obtener producto por ID:', error);
        throw new Error('Error en la base de datos al obtener el producto.');
    }
}

/**
 * Actualiza (PATCH) un producto por su ID.
 */
async function updateProduct(id, updates) {
    const fields = [];
    const params = { ...updates, id };

    Object.keys(updates).forEach(key => {
        fields.push(`${key} = :${key}`);
    });

    try {
        const sql = `UPDATE products SET ${fields.join(', ')} WHERE id = :id`;
        const [result] = await pool.query(sql, params);

        if (result.affectedRows === 0) {
            return null; // no encontrado
        }
        return getProductById(id); // devuelve el producto actualizado
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            throw new Error('El SKU ya está registrado.');
        }
        console.error('Error al actualizar producto:', error);
        throw new Error('Error en la base de datos al actualizar el producto.');
    }
}

/**
 * Lista, busca y pagina productos usando cursor.
 */
async function listProducts({ search, cursor, limit = 10 }) {
    try {
        let sql = `SELECT * FROM products WHERE 1=1`;
        const params = {};

        if (search) {
            sql += " AND (name LIKE :search OR sku LIKE :search)";
            params.search = `%${search}%`;
        }
        if (cursor) {
            sql += " AND id > :cursor";
            params.cursor = cursor;
        }

        sql += " ORDER BY id ASC";
        
        const queryLimit = parseInt(limit, 10) + 1;
        sql += " LIMIT :limit";
        params.limit = queryLimit;

        const [rows] = await pool.query(sql, params);
        
        let nextCursor = null;
        if (rows.length === queryLimit) {
            rows.pop();
            nextCursor = rows[rows.length - 1].id;
        }

        return { data: rows, nextCursor };
    } catch (error)
    {
        console.error('Error al listar productos:', error);
        throw new Error('Error en la base de datos al listar los productos.');
    }
}

module.exports = {
    createProduct,
    getProductById,
    updateProduct,
    listProducts
};