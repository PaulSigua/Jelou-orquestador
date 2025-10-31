// Cargar variables de entorno
require('dotenv').config(); 

const express = require('express');
const pool = require('./services/db');
const customerRoutes = require('./routes/customerRoutes');
const customerController = require('./controllers/customerController');
const { verifyServiceToken } = require('./middleware/auth');

// Configuración del servidor
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware para entender JSON
app.use(express.json());

// Rutas

// Endpoint de Health Check
app.get('/health', async (req, res) => {
    try {
        // Intentar obtener una conexión de la BDD
        console.log('Realizando health check de la base de datos...');
        const connection = await pool.getConnection();
        await connection.ping(); // Probar la conexión
        connection.release(); // Liberar la conexión
        
        res.status(200).json({ 
            status: 'ok', 
            message: 'API funcionando y conectada a la base de datos' 
        });
    } catch (error) {
        console.error('Error en health check:', error);
        res.status(503).json({ 
            status: 'error', 
            message: 'No se pudo conectar a la base de datos',
            error: error.message
        });
    }
});

// Rutas de clientes

app.use('/customers', customerRoutes);

app.get(
    '/internal/customers/:id',
    verifyServiceToken,
    customerController.handleGetCustomerById
)

// Iniciar Servidor 
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Customers API corriendo en http://localhost:${PORT}`);
});