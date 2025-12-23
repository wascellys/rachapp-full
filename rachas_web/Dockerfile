# Estágio de Build
FROM node:20-alpine AS build-stage

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Estágio de Produção
FROM nginx:alpine AS production-stage

# Copiar os arquivos de build para o diretório do Nginx
COPY --from=build-stage /app/dist/public /usr/share/nginx/html

# Copiar configuração personalizada do Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
