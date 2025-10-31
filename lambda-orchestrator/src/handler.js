'use strict';
require('dotenv').config();

const { orchestratorBodySchema } = require('./validations');
const { 
    validateCustomer, 
    createOrder, 
    confirmOrder,
    OrchestrationError
} = require('./apiClient');

// Funciones Helper para Respuestas

function formatResponse(statusCode, body) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
    };
}

function formatSuccess(data, correlationId) {
    const responseBody = {
        success: true,
        correlationId: correlationId || null,
        data: data
    };
    return formatResponse(201, responseBody); // 201 Created
}

function formatError(statusCode, message, correlationId) {
    const responseBody = {
        success: false,
        correlationId: correlationId || null,
        message: message
    };
    return formatResponse(statusCode, responseBody);
}

// Handler Principal del Lambda 

module.exports.main = async (event) => {
    let body;
    let correlationId = null;

    // Parsear y Validar el Body
    try {
        body = JSON.parse(event.body);
        correlationId = body.correlation_id || null;
        
        const { error } = orchestratorBodySchema.validate(body);
        if (error) {
            console.error('Error de validación:', error.details);
            return formatError(400, `Validación fallida: ${error.details[0].message}`, correlationId);
        }
    } catch (parseError) {
        return formatError(400, 'Cuerpo de la solicitud (body) inválido. Debe ser JSON.');
    }

    const { customer_id, items, idempotency_key } = body;

    // Iniciar Flujo de Orquestación 
    try {
        // Validar Cliente 
        console.log(`Validando cliente ${customer_id}`);
        const customer = await validateCustomer(customer_id);
        if (!customer) {
            return formatError(404, 'Cliente no encontrado.', correlationId);
        }

        // Crear orden 
        // (Preparamos el payload para la API de órdenes)
        const orderPayload = { customer_id, items };
        console.log(`Paso 2: Creando orden para cliente ${customer_id}`);
        const createdOrder = await createOrder(orderPayload);
        
        // Confirmar Orden 
        console.log(`Paso 3: Confirmando orden ${createdOrder.id} con key ${idempotency_key}`);
        const confirmedOrder = await confirmOrder(createdOrder.id, idempotency_key);
        
        // Consolidar y Responder
        console.log('Orquestación completada exitosamente.');
        const finalResponse = {
            customer: customer,
            order: confirmedOrder
        };
        
        return formatSuccess(finalResponse, correlationId);

    } catch (error) {
        // Manejar errores de orquestación
        if (error instanceof OrchestrationError) {
            console.error('Error de orquestación:', error.message);
            return formatError(error.statusCode, error.message, correlationId);
        }
        
        // Manejar errores inesperados
        console.error('Error inesperado del sistema:', error);
        return formatError(500, 'Error interno del servidor en el orquestador.', correlationId);
    }
};