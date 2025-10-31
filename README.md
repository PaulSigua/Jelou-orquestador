# Prueba Técnica - Orquestador de Pedidos B2B

Este repositorio contiene la solución a la prueba técnica para un puesto de Backend. El proyecto implementa un sistema de microservicios para gestionar clientes y órdenes, orquestado por una función Lambda.

**LAS VARIABLES DE ENTORNO YA ESTAN CONFIGURADAS EN LOS ARCHIVOS .env**

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

Se recomienda probar primero los endpoints individuales de cada API para verificar su funcionamiento antes de probar el flujo completo del orquestador.

### 1. Pruebas Individuales por API (Debugging)

#### Customers API (http://localhost:3001)

**Crear un cliente**

```json
curl -X POST http://localhost:3001/customers \
-H "Content-Type: application/json" \
-d '{
    "name": "Cliente de Prueba",
    "email": "prueba@test.com",
    "phone": "555-8888"
}'
```

**Listar clientes**
```json
curl http://localhost:3001/customers
```
---

#### Orders API (http://localhost:3002)

**Listar productos (cargados desde el seed.sql)**

```json
curl http://localhost:3002/products
```

**Crear una orden (Prueba de Transacción)**

**NOTA**: Esto descontará el stock del producto.
```json
curl -X POST http://localhost:3002/orders \
-H "Content-Type: application/json" \
-d '{
    "customer_id": 1,
    "items": [ { "product_id": 2, "qty": 10 } ]
}'
```

Espera: 201 Created. Anota el "id" de la orden (ej. 1)

### Confirmar la orden (Prueba de Idempotencia)

Reemplaza :id por el ID de la orden que creaste.

```json
curl -X POST http://localhost:3002/orders/1/confirm \
-H "X-Idempotency-Key: mi-clave-de-prueba-123"
```

Espera: 200 OK, orden en estado CONFIRMED.

(Si ejecutas el comando anterior de nuevo con la misma key,
deberías recibir un 200 OK de inmediato, sin re-procesar).

### Cancelar la orden (Prueba de Restauración de Stock)

Reemplaza :id por el ID de la orden.

```json
curl -X POST http://localhost:3002/orders/1/cancel
# Espera: 200 OK, orden en estado CANCELED.
# (El stock del producto 2 debería restaurarse).
```
---

### 2. Invocación del Flujo Completo (Lambda)

Este es el endpoint principal de la prueba. Envía un `POST` al Lambda Orquestador:

**Endpoint**: `POST http://localhost:3003/dev/orchestrator/create-and-confirm-order`
*(Nota: `/dev` es el "stage" por defecto de serverless-offline)*

**Body (JSON):**
```json
{ 
    "customer_id": 1, 
    "items": [ 
        { "product_id": 2, "qty": 3 } 
    ], 
    "idempotency_key": "mi-llave-unica-12345", 
    "correlation_id": "req-abc"
}
```

**Respuesta Exitosa (Ejemplo)**

```json
{
    "success": true,
    "correlationId": "req-abc",
    "data": {
        "customer": {
            "id": 1,
            "name": "ACME Inc."
        },
        "order": {
            "id": 2,
            "status": "CONFIRMED",
            "total_cents": 135000,
            "items": [ ... ]
        }
    }
}
```

Si envías la misma petición con la misma idempotency_key múltiples veces, el sistema procesará la orden solo una vez y devolverá una respuesta de conflicto porque ya se esta procesando la orden.

# Prueba Opcional (AWS + ngrok)

El reto también permite probar el Lambda desplegado en AWS mientras las APIs corren localmente.

1. Exponer APIs locales: Con Docker corriendo, usar ngrok para exponer los puertos locales:

```bash
ngrok http 3001 # Obtener URL pública para Customers
ngrok http 3002 # Obtener URL pública para Orders
```

2. Configurar Lambda: Actualizar lambda-orchestrator/.env con las URLs públicas de ngrok.

3. Desplegar Lambda: Desde lambda-orchestrator/, ejecutar:

```bash
serverless deploy
```

4. Probar: Invocar el endpoint de AWS API Gateway que serverless proporcione usando Postman/Insomnia.

# Documentación API (OpenAPI)

La documentación detallada de cada API (con todos los endpoints, parámetros y esquemas) se encuentra en los archivos openapi.yaml dentro de la carpeta de cada servicio.

- ./customers-api/openapi.yaml

- ./orders-api/openapi.yaml

(Puedes usar herramientas como **Swagger Editor** o **Stoplight Elements** para visualizar estos archivos).

## Psdt: Se que es una mala práctica subir variables de entorno (archivos `.env`) y más en proyectos como estos, pero como es una prueba se que no hay problema :).