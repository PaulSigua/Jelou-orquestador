const productService = require('../services/productService');
const { 
    createProductSchema, 
    updateProductSchema, 
    idParamSchema, 
    listProductsSchema 
} = require('../validations/productValidation');

// crear productos
async function handleCreateProduct(req, res) {
    try {
        const { error, value } = createProductSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ status: 'error', message: 'Datos inválidos.', details: error.details.map(d => d.message) });
        }
        const newProduct = await productService.createProduct(value);
        return res.status(201).json({ status: 'success', data: newProduct });
    } catch (error) {
        if (error.message === 'El SKU ya está registrado.') {
            return res.status(409).json({ status: 'error', message: error.message });
        }
        return res.status(500).json({ status: 'error', message: 'Error interno del servidor.' });
    }
}

// obtener producto por id
async function handleGetProductById(req, res) {
    try {
        const { error, value } = idParamSchema.validate(req.params);
        if (error) {
            return res.status(400).json({ status: 'error', message: 'ID inválido.' });
        }
        const product = await productService.getProductById(value.id);
        if (!product) {
            return res.status(404).json({ status: 'error', message: 'Producto no encontrado.' });
        }
        return res.status(200).json({ status: 'success', data: product });
    } catch (error) {
        return res.status(500).json({ status: 'error', message: 'Error interno del servidor.' });
    }
}

// actualizar el producto
async function handleUpdateProduct(req, res) {
    try {
        const { error: idError, value: idValue } = idParamSchema.validate(req.params);
        if (idError) {
            return res.status(400).json({ status: 'error', message: 'ID inválido.' });
        }
        const { error: bodyError, value: bodyValue } = updateProductSchema.validate(req.body);
        if (bodyError) {
            return res.status(400).json({ status: 'error', message: 'Datos inválidos.', details: bodyError.details.map(d => d.message) });
        }
        
        const updatedProduct = await productService.updateProduct(idValue.id, bodyValue);
        if (!updatedProduct) {
            return res.status(404).json({ status: 'error', message: 'Producto no encontrado.' });
        }
        return res.status(200).json({ status: 'success', data: updatedProduct });
    } catch (error) {
        if (error.message === 'El SKU ya está registrado.') {
            return res.status(409).json({ status: 'error', message: error.message });
        }
        return res.status(500).json({ status: 'error', message: 'Error interno del servidor.' });
    }
}

// listar los productos
async function handleListProducts(req, res) {
    try {
        const { error, value } = listProductsSchema.validate(req.query);
        if (error) {
            return res.status(400).json({ status: 'error', message: 'Query inválida.', details: error.details.map(d => d.message) });
        }
        const result = await productService.listProducts(value);
        return res.status(200).json({ status: 'success', ...result });
    } catch (error) {
        return res.status(500).json({ status: 'error', message: 'Error interno del servidor.' });
    }
}

module.exports = {
    handleCreateProduct,
    handleGetProductById,
    handleUpdateProduct,
    handleListProducts
};