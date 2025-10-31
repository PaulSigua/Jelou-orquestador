# Prueba Técnica - Orquestador de Pedidos B2B

Este repositorio contiene la solución a la prueba técnica para un puesto de Backend. El proyecto implementa un sistema de microservicios para gestionar clientes y órdenes, orquestado por una función Lambda.

# Arquitectura

El sistema está compuesto por tres servicios principales que se ejecutan de forma independiente:

- **customers-api**: Un servicio Node.js/Express que gestiona el CRUD de Clientes.

- **orders-api**: Un servicio Node.js/Express que gestiona el CRUD de Productos y la lógica de negocio de Órdenes (transacciones, idempotencia, etc.).

- **lambda-orchestrator**: Una función Serverless (AWS Lambda) que actúa como orquestador, consumiendo las otras dos APIs para completar un flujo de negocio.

# Tech Stack

- Backend: Node.js (Runtime 22) , Express 

- Base de Datos: MySQL 8.0

- Contenerización: Docker & Docker Compose

- Serverless: Serverless Framework, serverless-offline

- Validación: Joi (o Zod)

- Autenticación: JWT (para usuarios) y Token Estático (para servicio-a-servicio)

- Documentación: OpenAPI 3.0

# Estructura del Repositorio

```
├── docker-compose.yml     # Control maestro de servicios
├── README.md              # Este archivo
│
├── customers-api/         # Servicio de Clientes (Node/Express)
│   ├── Dockerfile
│   ├── .env.example
│   ├── openapi.yaml       # Documentación API
│   └── src/
│
├── orders-api/            # Servicio de Órdenes (Node/Express)
│   ├── Dockerfile
│   ├── .env.example
│   ├── openapi.yaml       # Documentación API
│   └── src/
│
├── lambda-orchestrator/   # Función Lambda (Serverless)
│   ├── .env.example
│   ├── serverless.yml
│   └── src/
│
└── db/                    # Scripts de Base de Datos
    ├── schema.sql         # Estructura de tablas
    └── seed.sql           # Datos de prueba iniciales
```
# Cómo Levantar el Entorno Local

Sigue estos pasos para levantar todo el stack (APIs + Base de Datos) en tu máquina local.

### 1. Prerrequisitos

- Docker y Docker Compose

- Node.js (v18 o superior)

- NPM

### 2. Levantar las APIs y la Base de Datos (Docker)

En la raíz del proyecto, ejecuta:

```bash
# 1. Construir las imágenes de Docker
docker-compose build

# 2. Levantar todos los servicios
docker-compose up
```

### 3. Levantar el Lambda Orquestador (Local)

El Lambda se ejecuta fuera de Docker (localmente) para simular el entorno de serverless-offline.

Abre una nueva terminal y navega a la carpeta del Lambda:

```bash
# 1. Navegar al directorio
cd lambda-orchestrator

# 2. Instalar dependencias
pnpm install
o
npm install

# 3. Iniciar el simulador de API Gateway y Lambda
pnpm run dev
o 
npm run dev
```

# URLs del Entorno Local

Una vez levantado todo, los servicios estarán disponibles en:

- Customers API: http://localhost:3001

- Orders API: http://localhost:3002

- Lambda Orquestador: http://localhost:3003 (API Gateway local)

- Base de Datos: localhost:3306 (para inspección con un cliente SQL)

# Cómo Probar

Puedes usar Postman, Insomnia o cURL para probar los servicios.

Ejemplos cURL (APIs)

``` bash
# --- Customers API ---

# Crear un cliente
curl -X POST http://localhost:3001/customers \
-H "Content-Type: application/json" \
-d '{
    "name": "Cliente de Prueba",
    "email": "prueba@test.com",
    "phone": "555-8888"
}'

# Listar clientes
curl http://localhost:3001/customers

# Orders API

# Listar productos (cargados desde el seed.sql)
curl http://localhost:3002/products
```

# Invocación del Flujo Completo (Lambda)

Este es el endpoint principal de la prueba. Envía un POST al Lambda Orquestador:

**Endpoint**: POST http://localhost:3003/dev/orchestrator/create-and-confirm-order (Nota: /dev es el "stage" por defecto de serverless-offline)

**Body (JSON):**

```bash
{ 
    "customer_id": 1, 
    "items": [ 
        { "product_id": 2, "qty": 3 } 
    ], 
    "idempotency_key": "mi-llave-unica-12345", 
    "correlation_id": "req-abc"
}
```

# Respuesta Exitosa (Ejemplo)

```
{
    "success": true,
    "correlationId": "req-abc",
    "data": {
        "customer": {
            "id": 1,
            "name": "ACME Inc.",
            ...
        },
        "order": {
            "id": 1,
            "status": "CONFIRMED",
            "total_cents": 135000,
            "items": [ ... ]
        }
    }
}
```

Si envías la misma petición con la misma idempotency_key múltiples veces, el sistema procesará la orden solo una vez y devolverá que hay idempotencia.

# Documentación API (OpenAPI)

La documentación detallada de cada API (con todos los endpoints, parámetros y esquemas) se encuentra en los archivos openapi.yaml dentro de la carpeta de cada servicio.

- ./customers-api/openapi.yaml

- ./orders-api/openapi.yaml

(Puedes usar herramientas como **Swagger Editor** o **Stoplight Elements** para visualizar estos archivos).