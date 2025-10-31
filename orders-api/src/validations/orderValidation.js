const Joi = require('joi');

// Esquema para un item individual dentro de la orden
const orderItemSchema = Joi.object({
    product_id: Joi.number().integer().positive().required(),
    qty: Joi.number().integer().positive().required()
});

// Esquema para crear una orden
const createOrderSchema = Joi.object({
    customer_id: Joi.number().integer().positive().required(),
    items: Joi.array().items(orderItemSchema).min(1).required()
});

// Esquema para validar un ID en los parámetros
const idParamSchema = Joi.object({
    id: Joi.number().integer().positive().required()
});

// Esquema para validar los headers de idempotencia
const idempotencyHeaderSchema = Joi.object({
    'x-idempotency-key': Joi.string().trim().required()
}).unknown(true); // .unknown(true) ignora otros headers

// Esquema para validar la query de listado
const listOrdersSchema = Joi.object({
    status: Joi.string().trim().valid('CREATED', 'CONFIRMED', 'CANCELED').optional(),
    from: Joi.date().iso().optional(),
    to: Joi.date().iso().optional(),
    cursor: Joi.number().integer().positive().optional(),
    limit: Joi.number().integer().positive().default(20).max(100)
});

module.exports = {
    createOrderSchema,
    idParamSchema,
    idempotencyHeaderSchema,
    listOrdersSchema
};