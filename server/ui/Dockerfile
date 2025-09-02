# Usa uma imagem Nginx super leve para servir nosso arquivo estático
FROM nginx:1.25-alpine

# Remove a página padrão do Nginx
RUN rm /usr/share/nginx/html/index.html

# Copia todos os arquivos da interface para o diretório web do Nginx
COPY index.html /usr/share/nginx/html/index.html
COPY style.css /usr/share/nginx/html/style.css
COPY script.js /usr/share/nginx/html/script.js
COPY docker-api.js /usr/share/nginx/html/docker-api.js