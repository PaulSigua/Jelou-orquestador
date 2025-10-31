const customerService = require('../services/customerService');
const { createCustomerSchema, idParamSchema, updateCustomerSchema, listCustomersSchema } = require('../validations/customerValidation');

/**
 * Controlador para crear un nuevo cliente.
 */

async function handleCreateCustomer(req, res) {
    try {
        const { error, value } = createCustomerSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                status: 'error',
                message: 'Datos de entrada invalidos',
                details: error.details.map(d => d.message)
            });
        }

        const newCustomer = await customerService.createCustomer(value);
        return res.status(201).json({
            status: 'success',
            message: 'Cliente creado exitosamente',
            data: newCustomer
        });
    } catch (error) {
        if (error.message === 'El correo electronico ya esta registrado.') {
            return res.status(409).json({
                status: 'error',
                message: error.message
            });
        }

        console.error('Error en handleCreateCustomer:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Error interno del servidor al crear el cliente'
        })
    }
}

/**
 * Controlador para obtener un cliente por ID.
 */
async function handleGetCustomerById(req, res) {
    try {
        const { error, value } = idParamSchema.validate(req.params);
        if (error) {
            return res.status(400).json({
                status: 'error',
                message: 'ID del cliente invalido',
                details: error.details.map(d => d.message)
            });
        }

        const customer = await customerService.getCustomerById(value.id);

        if (!customer) {
            return res.status(404).json({
                status: 'error',
                message: 'Cliente no encontrado',
            })
        }

        return res.status(200).json({
            status: 'success',
            data: customer
        })
    } catch (error) {
        console.error('Error en handleGetCustomerById:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Error interno del servidor al obtener el cliente'
        })
    }
}

/**
 * Controlador para actualizar un cliente por ID
 */

async function handleUpdateCustomerById(req, res) {
    try {
        const { error: idError, value: idValue } = idParamSchema.validate(req.params);
        if (idError) {
            return res.status(400).json({
                status: 'error',
                message: 'ID del cliente invalido'
            })
        } 

        const { error: bodyError, value: bodyValue } = updateCustomerSchema.validate(req.body);
        if (bodyError) {
            return res.status(400).json({
                status: 'error',
                message: 'Datos de actualizacion invalidos',
                details: bodyError.details.map(d => d.message)
            });
        }

        const updateCustomerById =  await customerService.updateCustomerById(idValue.id, bodyValue)

        if (!updateCustomerById) {
            return res.status(404).json({
                status: 'error',
                message: 'Cliente no encontrado'
            })
        }

        return res.status(200).json({
            status: 'success',
            data: updateCustomerById
        })

    } catch (error) {
        if (error.message === 'El correo electronico ya esta registrado.') {
            return res.status(409).json({
                status: 'error',
                message: error.message
            });
        }

        console.error('Error en handleUpdateCustomerById: ', error)
        return res.status(500).json({
            status: 'error',
            message: 'Error interno del servidor al actualizar el cliente.'
        })
    }
}

async function handleDeleteCustomerById(req, res) {
    try {
        const { error, value } = idParamSchema.validate(req.params);
        if (error) {
            return res.status(400).json({
                status: 'error',
                message: 'ID del cliente invalido'
            });
        };

        const affectedRows = await customerService.deleteCustomerById(value.id);

        if (affectedRows === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Cliente no encontrado'
            });
        };

        return res.status(204).send();

    } catch (error) {
        console.error('Error en handleDeleteCustomerById: ', error);
        return res.status(500).json({
            status: 'error',
            message: 'Error interno del servidor al eliminar el cliente.'
        })
    }
}

async function handleListCustomers(req, res) {
    try {
        const { error, value } = listCustomersSchema.validate(req.query);
        if (error) {
            return res.status(400).json({
                status: 'error',
                message: 'Parametros de consulta invalidos',
                details: error.details.map(d => d,message)
            });
        };

        const result = await customerService.listCustomers(value);

        return res.status(200).json({
            status: 'success',
            ...result
        })

    } catch (error) {
        console.error('Error en handleListCustomers: ', error);
        return res.status(500).json({
            status: 'error',
            message: 'Error interno del servidor al listar los clientes.'
        });
    }
}

module.exports = {
    handleCreateCustomer,
    handleGetCustomerById,
    handleUpdateCustomerById,
    handleDeleteCustomerById,
    handleListCustomers
}