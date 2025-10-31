const Joi = require('joi');

// Esquema para crear un producto
const createProductSchema = Joi.object({
    sku: Joi.string().min(3).max(100).required(),
    name: Joi.string().min(3).max(255).required(),
    price_cents: Joi.number().integer().positive().required(),
    stock: Joi.number().integer().min(0).default(0)
});

// Esquema para actualizar (PATCH) un producto
const updateProductSchema = Joi.object({
    sku: Joi.string().min(3).max(100).optional(),
    name: Joi.string().min(3).max(255).optional(),
    price_cents: Joi.number().integer().positive().optional(),
    stock: Joi.number().integer().min(0).optional()
}).min(1); // Debe venir al menos un campo para actualizar

// Esquema para validar un ID en los parámetros
const idParamSchema = Joi.object({
    id: Joi.number().integer().positive().required()
});

// Esquema para validar la query de listado
const listProductsSchema = Joi.object({
    search: Joi.string().trim().optional().allow(''),
    cursor: Joi.number().integer().positive().optional(),
    limit: Joi.number().integer().positive().default(10).max(100)
});

module.exports = {
    createProductSchema,
    updateProductSchema,
    idParamSchema,
    listProductsSchema
};