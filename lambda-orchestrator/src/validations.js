const Joi = require('joi');

// Esquema para un item individual
const itemSchema = Joi.object({
    product_id: Joi.number().integer().positive().required(),
    qty: Joi.number().integer().positive().required()
});

// Esquema para el body principal del orquestador
const orchestratorBodySchema = Joi.object({
    customer_id: Joi.number().integer().positive().required(),
    items: Joi.array().items(itemSchema).min(1).required(),
    idempotency_key: Joi.string().trim().required(),
    correlation_id: Joi.string().trim().optional() 
});

module.exports = {
    orchestratorBodySchema
};