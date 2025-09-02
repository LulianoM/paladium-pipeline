FROM bluenviron/mediamtx:latest

# Esta linha vai testar se o arquivo mediamtx.yml existe.
# Se o Docker não o encontrar no "contexto" do build, o comando falhará
# e a construção da imagem será interrompida com um erro.
RUN test -f mediamtx.yml

COPY mediamtx.yml /mediamtx.yml