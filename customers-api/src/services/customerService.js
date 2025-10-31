const pool = require('./db'); // Importamos el pool de BDD

/**
 * Crea un nuevo cliente en la base de datos.
 */
async function createCustomer({ name, email, phone }) {
    try {
        const sql = `
            INSERT INTO customers (name, email, phone) 
            VALUES (:name, :email, :phone)
        `;
        
        // Usamos consultas parametrizadas (:name) para seguridad
        const [result] = await pool.query(sql, { name, email, phone });

        // Devolvemos el ID del cliente recién creado
        return { id: result.insertId, name, email, phone };

    } catch (error) {
        // Manejo de errores (ej. email duplicado)
        if (error.code === 'ER_DUP_ENTRY') {
            throw new Error('El correo electrónico ya está registrado.');
        }
        console.error('Error al crear cliente:', error);
        throw new Error('Error en la base de datos al crear el cliente.');
    }
}
/**
 * Obtiene un cliente por su ID.
 */
async function getCustomerById(id) {
    try {
        const sql = `
            SELECT id, name, email, phone, created_at
            FROM customers
            WHERE id = :id AND deleted_at IS NULL
        `;

        const [rows] = await pool.query(sql, {id});

        if (rows.length === 0) {
            return null;
        }

        return rows[0];

    } catch (error) {
        console.error('Error al obtener cliente por ID:', error);
        throw new Error('Error en la base de datos al obtener el cliente.');
    };
}

/**
 * Actualiza un cliente por ID.
 */
async function updateCustomerById(id, updates) {
    const fields = [];
    const params = {...updates, id};

    Object.keys(updates).forEach(key => {
        fields.push(`${key} = :${key}`);
    });

    if (fields.length === 0) {
        return getCustomerById(id);
    }

    const setClause = fields.join(', ');

    try {
        const sql = `
            UPDATE customer
            SET ${setClause}
            WHERE id = :id AND deleted_as IS NULL
        `;

        const [result] = await pool.query(sql, params);

        if (result.affectedRows === 0) {
            return null;
        }

        return getCustomerById(id);

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            throw new Error('El correo electronico ya esta registrado.')
        }
        console.error('Error al actualizar cliente por ID: ', error);
        throw new Error('Error en la base de datos al actualizar el cliente.');
    }
}

/**
 * Elimina un cliente por ID (soft delete).
 */
async function deleteCustomerById(id) {
    try {
        const sql = `
            UPDATE customers
            SET deleted_at = CURRENT_TIMESTAMP
            WHERE id = :id AND deleted_at IS NULL
        `;
        
        const [result] = await pool.query(sql, {id});

        return result.affectedRows > 0;

    } catch (error) {
        console.error('Error al eliminar cliente: ', error);
        throw new Error('Error en la base de datos al eliminar el cliente.');
    }
}

/**
 * Lista, busca y pagina clientes usando paginacion basada en cursor (ID).
 */
async function listCustomers({search, cursor, limit = 10}) {
    try {
        let sql = `
            SELECT id, name, email, phone, created_at
            FROM customers
            WHERE deleted_at IS NULL
        `;

        const params = {};

        // Filtro de busqueda
        if (search) {
            sql += " AND (name LIKE :search OR email LIKE :search)";
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
        let data = rows;

        // Comprobar si hay una siguiente página
        if (rows.length === queryLimit) {
            rows.pop();

            nextCursor = rows[rows.length - 1].id;
            data = rows;
        }

        return {
            data,
            nextCursor
        };

    } catch (error) {
        console.error('Error al listar clientes: ', error);
        throw new Error('Error en la base de datos al listar los clientes.');
    } 
}

module.exports = {
    createCustomer,
    getCustomerById,
    updateCustomerById,
    deleteCustomerById,
    listCustomers
};