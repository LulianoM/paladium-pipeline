# Usa uma imagem Nginx super leve para servir nosso arquivo estático
FROM nginx:1.25-alpine

# Remove a página padrão do Nginx
RUN rm /usr/share/nginx/html/index.html

# Copia nossa página HTML para o diretório web do Nginx
COPY index.html /usr/share/nginx/html/index.html