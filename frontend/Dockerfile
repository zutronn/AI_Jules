FROM nginx:alpine
COPY dist/ /usr/share/nginx/html/
# SPA fallback: serve index.html for any route not found
RUN echo 'server { listen 8080; root /usr/share/nginx/html; index index.html; location / { try_files $uri $uri/ $uri/index.html /index.html; } }' > /etc/nginx/conf.d/default.conf
EXPOSE 8080
