# 1. Usar la imagen oficial de Node.js 22
FROM node:22-alpine

# 2. Establecer el directorio de trabajo dentro del contenedor
WORKDIR /usr/src/app

# 3. Copiar el package.json y package-lock.json
COPY package*.json ./

# 4. Instalar las dependencias
RUN npm install

# 5. Copiar el resto del código fuente de la API
COPY . .

# 6. Exponer el puerto en el que correrá la API
EXPOSE 3001

# 7. El comando para iniciar la aplicación
CMD [ "npm", "run", "dev" ]