require('dotenv').config();
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

/**
 * Middleware para verificar tokens de servicio interno de autenticación.
 */
function verifyServiceToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({
            status: 'error',
            message: 'Acceso no autorizado: falta el header de autorizacion'
        });
    }

    const token = authHeader.authHeader.split(' ')[1]; // Formato beaber

    if (token && token === INTERNAL_TOKEN) {
        next();
    } else {
        return res.status(403).json({
            status: 'error',
            message: 'Acceso denegadoL token invalido'
        });
    }
}

module.exports = {
    verifyServiceToken
}