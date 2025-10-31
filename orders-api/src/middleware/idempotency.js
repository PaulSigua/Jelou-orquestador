const idempotencyService = require('../services/idempotencyService');
const { idParamSchema, idempotencyHeaderSchema } = require('../validations/orderValidation');

/**
 * Middleware para manejar la idempotencia.
 * @param {string} type - pasandole un nombre para esta acción
 */
function makeIdempotent(type) {
    return async (req, res, next) => {
        
        // validar ID y Header
        const { error: idError, value: idValue } = idParamSchema.validate(req.params);
        if (idError) {
            return res.status(400).json({ status: 'error', message: 'ID de orden inválido.' });
        }
        
        const { error: headerError, value: headerValue } = idempotencyHeaderSchema.validate(req.headers);
        if (headerError) {
            return res.status(400).json({ status: 'error', message: 'Falta el header X-Idempotency-Key.' });
        }

        const key = headerValue['x-idempotency-key'];
        const targetId = idValue.id;

        try {
            // buscar la clave
            const existingKey = await idempotencyService.findKey(key);

            if (existingKey) {
                // la clave existe
                if (existingKey.status === 'completed') {
                    // si ya se completó, devolver respuesta guardada
                    const storedResponse = JSON.parse(existingKey.response_body);
                    return res.status(storedResponse.statusCode).json(storedResponse.body);
                } else if (existingKey.status === 'processing') {
                    // si se está procesando, devolver conflicto
                    return res.status(409).json({ status: 'error', message: 'La solicitud se está procesando (conflicto de idempotencia).' });
                }
            }
            
            // si la clave no existe, crear clave como 'processing'
            await idempotencyService.createKey(key, type, targetId);

            // ejecutar el controlador real (handleConfirmOrder)
            // usamos res para "capturar" la respuesta y no enviarla todavía.
            const originalSend = res.send;
            const originalJson = res.json;
            let responseSent = false;

            res.json = (body) => {
                // esta función se llama cuando el controlador ejecuta res.json()
                // el controlador guardó la respuesta en req.idempotencyResponse
                responseSent = true;
                originalJson.call(res, body);
            };
            res.send = (body) => {
                responseSent = true;
                originalSend.call(res, body);
            };

            // pasamos al siguiente middleware (el controlador)
            next();

            // después de que el controlador termine
            // esperamos un momento para asegurar que `res.json` se haya llamado
            await new Promise(resolve => setImmediate(resolve));
            
            if (responseSent && req.idempotencyResponse) {
                // guardar la respuesta (exitosa o de error) en la BDD
                const { statusCode, body } = req.idempotencyResponse;
                await idempotencyService.completeKey(key, statusCode, body);
            }
            // la respuesta ya fue enviada por el res.json() "capturado"

        } catch (error) {
            if (error.message === 'IDEMPOTENCY_CONFLICT') {
                return res.status(409).json({ status: 'error', message: 'La solicitud se está procesando (conflicto de idempotencia).' });
            }
            console.error('Error grave en middleware de idempotencia:', error);
            return res.status(500).json({ status: 'error', message: 'Error interno en el servidor (idempotencia).' });
        }
    };
}

module.exports = {
    makeIdempotent
};