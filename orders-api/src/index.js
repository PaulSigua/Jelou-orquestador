// Cargar variables de entorno
require('dotenv').config(); 

const express = require('express');
const pool = require('./services/db');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');

// Configuración del servidor
const app = express();
const PORT = process.env.PORT || 3002;

// Middleware para entender JSON
app.use(express.json());

// Rutas

// Endpoint de Health Check
app.get('/health', async (req, res) => {
    try {
        console.log('Estableciendo conexion con la base de datos.');
        const connection = await pool.getConnection();
        await connection.ping(); // Probar la conexión
        connection.release(); // Liberar la conexión
        
        res.status(200).json({ 
            status: 'ok', 
            message: 'API de Órdenes funcionando y conectada a la base de datos' 
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

// Rutas de la API
app.use('/products', productRoutes);
app.use('/orders', orderRoutes);

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Orders api corriendo en http://localhost:${PORT}`);
})