# Stage 1: Build the frontend
FROM node:22-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine
COPY --from=builder /app/dist/ /usr/share/nginx/html/
# SPA fallback: serve index.html for any route not found
RUN echo 'server { listen 8080; root /usr/share/nginx/html; index index.html; location / { try_files $uri $uri/ $uri/index.html /index.html; } }' > /etc/nginx/conf.d/default.conf
EXPOSE 8080
