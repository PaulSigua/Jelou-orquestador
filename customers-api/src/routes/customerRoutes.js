const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');

// crear cliente
router.post('/', customerController.handleCreateCustomer);

// lista/busca/pagina de clientes
router.get('/', customerController.handleListCustomers);

// obtener el detalle de cliente
router.get('/:id', customerController.handleGetCustomerById);

// actualizar el cliente
router.put('/:id', customerController.handleUpdateCustomerById);

// eliminar un cliente
router.delete('/:id', customerController.handleDeleteCustomerById);

module.exports = router;