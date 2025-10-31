const pool = require('./db');

/**
 * Busca una clave de idempotencia.
 * @param {string} key - La clave del header X-Idempotency-Key.
 * @returns {Promise<object|null>} - El registro de la clave si existe.
 */
async function findKey(key) {
    const [rows] = await pool.query(
        `SELECT * FROM idempotency_keys WHERE \`key\` = ?`,
        [key]
    );
    return rows[0] || null;
}

/**
 * Crea una nueva clave de idempotencia con estado 'processing'.
 * @param {string} key - la clave.
 * @param {string} targetType - 'order_confirmation'
 * @param {number} targetId - el ID de la orden
 */
async function createKey(key, targetType, targetId) {
    try {
        await pool.query(
            `INSERT INTO idempotency_keys (\`key\`, target_type, target_id, status) 
             VALUES (?, ?, ?, 'processing')`,
            [key, targetType, targetId]
        );
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            // esto es una "race condition". Otro proceso la insertó
            // justo entre nuestro findKey() y nuestro createKey().
            // Lanzamos un error específico para que el middleware lo maneje
            // como un 409 Conflict.
            throw new Error('IDEMPOTENCY_CONFLICT');
        }
        throw error;
    }
}

/**
 * Actualiza una clave a 'completed' y guarda el cuerpo de la respuesta.
 * @param {string} key - la clave.
 * @param {number} statusCode - el código de estado HTTP
 * @param {object} responseBody - el JSON de la respuesta.
 */
async function completeKey(key, statusCode, responseBody) {
    // Guardamos la respuesta completa (incluyendo status)
    const storedResponse = {
        statusCode,
        body: responseBody
    };
    
    await pool.query(
        `UPDATE idempotency_keys SET status = 'completed', response_body = ? WHERE \`key\` = ?`,
        [JSON.stringify(storedResponse), key]
    );
}

module.exports = {
    findKey,
    createKey,
    completeKey
};