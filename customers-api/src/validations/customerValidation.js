const Joi = require('joi');

// Esquema de validación para crear un cliente
const createCustomerSchema = Joi.object({
    name: Joi.string().min(3).max(255).required(),
    email: Joi.string().email().max(255).required(),
    phone: Joi.string().min(5).max(50).optional()
});

// Esquema para validar un ID en los parametros
const idParamSchema = Joi.object({
    id: Joi.number().integer().positive().required()
})

// Esquema de validacion para actualizar un cliente
const updateCustomerSchema = Joi.object({
    name: Joi.string().min(3).max(255).optional(),
    email: Joi.string().email().max(255).optional(),
    phone: Joi.string().min(5).max(50).optional().allow(null)
}).min(1);

const listCustomersSchema = Joi.object({
    search: Joi.string().trim().optional().allow(''),
    cursor: Joi.number().integer().positive().optional(),
    limit: Joi.number().integer().positive().default(10).max(100)
})

module.exports = {
    createCustomerSchema,
    idParamSchema,
    updateCustomerSchema,
    listCustomersSchema
};