// Cargar variables de entorno
require('dotenv').config(); 
const mysql = require('mysql2/promise');

// Configuración de la Conexión a BDD
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // Habilitar SQL parametrizado (previene inyección SQL)
    namedPlaceholders: true 
};

// Crear y exportar el pool
const pool = mysql.createPool(dbConfig);

module.exports = pool;