require('dotenv').config();
const axios = require('axios');

const {
    CUSTOMERS_API_URL,
    ORDERS_API_URL,
    INTERNAL_SERVICE_TOKEN
} = process.env;

// Creamos una instancia de Axios con el token de autorización
const apiClient = axios.create({
    headers: {
        'Authorization': `Bearer ${INTERNAL_SERVICE_TOKEN}`,
        'Content-Type': 'application/json'
    },
    timeout: 5000 // 5 segundos de timeout
});

// Clase de error personalizada para manejar fallos en la orquestación
class OrchestrationError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.name = 'OrchestrationError';
        this.statusCode = statusCode;
    }
}

/**
 * 1. Valida al cliente
 */
async function validateCustomer(customerId) {
    try {
        const url = `${process.env.CUSTOMERS_API_URL}/customers/${customerId}`;
        
        const response = await axios.get(url, {
            headers: {
                'Authorization': `Bearer ${process.env.INTERNAL_SERVICE_TOKEN}`
            }
        });

        return response.data.data;

    } catch (error) {
        const status = error.response?.status || 500;
        console.error(`Error ${status} validando cliente ${customerId}:`, error.message);
        throw new OrchestrationError('El cliente no es válido o no se pudo contactar la API de clientes.', status);
    }
}

/**
 * 2. Crea la orden
 */
async function createOrder(payload) {
    try {
        const url = `${ORDERS_API_URL}/orders`;
        const response = await apiClient.post(url, payload);
        return response.data.data; // Devuelve la orden creada
    } catch (error) {
        const status = error.response?.status || 500;
        const message = error.response?.data?.message || 'Error al crear la orden.';
        console.error(`Error ${status} creando orden:`, message);
        
        if (status === 409) { // Ej. Falta de stock
            throw new OrchestrationError(message, 409);
        }
        throw new OrchestrationError(message, status);
    }
}

/**
 * 3. Confirma la orden (Idempotente)
 */
async function confirmOrder(orderId, idempotencyKey) {
    try {
        const url = `${ORDERS_API_URL}/orders/${orderId}/confirm`;
        const response = await apiClient.post(url, {}, { // Body vacío
            headers: {
                'X-Idempotency-Key': idempotencyKey
            }
        });
        return response.data.data; // Devuelve la orden confirmada
    } catch (error) {
        const status = error.response?.status || 500;
        const message = error.response?.data?.message || 'Error al confirmar la orden.';
        console.error(`Error ${status} confirmando orden ${orderId}:`, message);
        throw new OrchestrationError(message, status);
    }
}

module.exports = {
    validateCustomer,
    createOrder,
    confirmOrder,
    OrchestrationError
};