-- CREATE DATABASE IF NOT EXISTS b2b_orders;
-- USE b2b_orders;

-- 1. Tabla de Clientes
CREATE TABLE customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL -- Para el soft-delete opcional 
) ENGINE=InnoDB;

-- 2. Tabla de Productos
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sku VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    price_cents INT NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 3. Tabla de Órdenes
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    status ENUM('CREATED', 'CONFIRMED', 'CANCELED') NOT NULL DEFAULT 'CREATED',
    total_cents INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (customer_id) REFERENCES customers(id)
) ENGINE=InnoDB;

-- 4. Tabla de Items de la Orden (tabla pivote)
CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    qty INT NOT NULL,
    unit_price_cents INT NOT NULL, -- Precio al momento de la compra
    subtotal_cents INT NOT NULL,   -- (qty * unit_price_cents)
    
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;

-- 5. Tabla de Idempotencia (Clave para el reto)
CREATE TABLE idempotency_keys (
    `key` VARCHAR(255) PRIMARY KEY, -- La llave única [cite: 52]
    target_type VARCHAR(100),       -- Ej: 'order_confirmation'
    target_id INT,                  -- Ej: El ID de la orden
    status VARCHAR(50) DEFAULT 'processing',
    response_body JSON,             -- La respuesta a devolver [cite: 52]
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL
) ENGINE=InnoDB;