FROM alpine:latest

# Instala o MediaMTX
RUN apk add --no-cache wget && \
    wget https://github.com/bluenviron/mediamtx/releases/download/v1.14.0/mediamtx_v1.14.0_linux_amd64.tar.gz && \
    tar -xzf mediamtx_v1.14.0_linux_amd64.tar.gz && \
    mv mediamtx /usr/local/bin/ && \
    rm -rf mediamtx_v1.14.0_linux_amd64.tar.gz

# Copia o arquivo de configuração
COPY mediamtx.yml /mediamtx.yml

CMD ["mediamtx", "/mediamtx.yml"]