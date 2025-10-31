require('dotenv').config();
const axios = require('axios');

// configuración de la API de Clientes
const CUSTOMERS_API_URL = process.env.CUSTOMERS_API_URL; 
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

// instancia de Axios pre-configurada
const apiClient = axios.create({
    baseURL: CUSTOMERS_API_URL,
    headers: {
        'Authorization': `Bearer ${INTERNAL_TOKEN}`,
        'Content-Type': 'application/json'
    },
    timeout: 5000 // 5 segundos de timeout
});

/**
 * Valida si un cliente existe llamando al endpoint interno de customers-api.
 * @param {number} customerId - El ID del cliente a validar.
 * @returns {Promise<object|null>} - Los datos del cliente si existe, o null si no.
 */
async function validateCustomer(customerId) {
    try {
        // usar 'apiClient' (que ya tiene el token y la baseURL)
        // usar la ruta relativa
        const response = await apiClient.get(`/customers/${customerId}`); 
        
        // devolver los datos
        return response.data.data; 

    } catch (error) {
        // si la API responde 404, 403, 500, etc.
        // asumimos que el cliente no es válido.
        console.error(`Error validando cliente ${customerId}:`, error.message);
        return null;
    }
}

module.exports = {
    validateCustomer
};