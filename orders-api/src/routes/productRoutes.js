const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// Crear producto
router.post('/', productController.handleCreateProduct);

// Listar/buscar/paginar productos
router.get('/', productController.handleListProducts);

// Detalle de producto
router.get('/:id', productController.handleGetProductById);

// Actualizar precio/stock 
// Usamos PATCH como se pide, no PUT
router.patch('/:id', productController.handleUpdateProduct);

module.exports = router;