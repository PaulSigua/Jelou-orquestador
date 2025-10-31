const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { makeIdempotent } = require('../middleware/idempotency');

// crear una orden
router.post('/', orderController.handleCreateOrder);

// Listar/filtrar órdenes
router.get('/', orderController.handleListOrders);

// Detalle de orden
router.get('/:id', orderController.handleGetOrderById);

// Confirmar orden (Idempotente)
router.post(
    '/:id/confirm', 
    makeIdempotent('order_confirmation'),
    orderController.handleConfirmOrder
);

// Cancelar orden (Transaccional)
router.post('/:id/cancel', orderController.handleCancelOrder);

module.exports = router;