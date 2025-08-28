# RTSP Pipeline Makefile
# Comandos para gerenciar o servidor RTSP

.PHONY: help build up down logs restart clean demo status health

# Configurações
COMPOSE_FILE = docker-compose.yml
SERVICE_NAME = rtsp-server
VIDEO_FILE = ../video.mp4

help: ## Mostrar esta ajuda
	@echo "RTSP Pipeline - Comandos Disponíveis:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

validate: ## Validar pré-requisitos antes de iniciar
	@echo "🔍 Validando pré-requisitos..."
	@python3 scripts/validate.py

build: ## Construir a imagem Docker
	@echo "🔨 Construindo imagem Docker..."
	docker-compose -f $(COMPOSE_FILE) build

up: ## Iniciar o servidor RTSP
	@echo "🚀 Iniciando servidor RTSP..."
	@if [ ! -f $(VIDEO_FILE) ]; then \
		echo "❌ Erro: Arquivo $(VIDEO_FILE) não encontrado!"; \
		echo "   Certifique-se de que o arquivo video.mp4 existe no diretório pai."; \
		exit 1; \
	fi
	docker-compose -f $(COMPOSE_FILE) up -d
	@echo "✅ Servidor iniciado!"
	@echo "📺 URL do stream: rtsp://localhost:8554/cam1"
	@echo "🎬 Teste no VLC: rtsp://localhost:8554/cam1"

down: ## Parar o servidor RTSP
	@echo "🛑 Parando servidor RTSP..."
	docker-compose -f $(COMPOSE_FILE) down
	@echo "✅ Servidor parado!"

logs: ## Mostrar logs do servidor
	@echo "📋 Logs do servidor RTSP:"
	docker-compose -f $(COMPOSE_FILE) logs -f $(SERVICE_NAME)

restart: down up ## Reiniciar o servidor RTSP

clean: ## Limpar containers e imagens
	@echo "🧹 Limpando containers e imagens..."
	docker-compose -f $(COMPOSE_FILE) down -v --remove-orphans
	docker-compose -f $(COMPOSE_FILE) down --rmi all
	@echo "✅ Limpeza concluída!"

demo: validate build up ## Comando único para demo (validate + build + up)
	@echo "🎉 Demo iniciada!"
	@echo ""
	@echo "📺 URLs para teste:"
	@echo "   VLC: rtsp://localhost:8554/cam1"
	@echo "   Browser (se suportado): rtsp://localhost:8554/cam1"
	@echo ""
	@echo "🔍 Para monitorar:"
	@echo "   make logs    - Ver logs em tempo real"
	@echo "   make status  - Ver status do container"
	@echo "   make health  - Verificar saúde do serviço"
	@echo ""
	@echo "🛑 Para parar:"
	@echo "   make down    - Parar servidor"

status: ## Mostrar status dos containers
	@echo "📊 Status dos containers:"
	docker-compose -f $(COMPOSE_FILE) ps

health: ## Verificar saúde do servidor
	@echo "🏥 Verificando saúde do servidor..."
	@if docker-compose -f $(COMPOSE_FILE) ps | grep -q "Up"; then \
		echo "✅ Servidor está rodando"; \
		docker-compose -f $(COMPOSE_FILE) exec $(SERVICE_NAME) gst-inspect-1.0 rtspsrc > /dev/null 2>&1 && \
		echo "✅ GStreamer RTSP funcionando" || \
		echo "❌ Problema com GStreamer RTSP"; \
	else \
		echo "❌ Servidor não está rodando"; \
	fi

dev-shell: ## Abrir shell no container para debug
	@echo "🐚 Abrindo shell no container..."
	docker-compose -f $(COMPOSE_FILE) exec $(SERVICE_NAME) /bin/bash

test-gstreamer: ## Testar pipeline GStreamer localmente
	@echo "🧪 Testando pipeline GStreamer..."
	docker-compose -f $(COMPOSE_FILE) exec $(SERVICE_NAME) gst-launch-1.0 \
		filesrc location=/app/video/video.mp4 ! \
		qtdemux ! h264parse ! avdec_h264 ! \
		videoconvert ! autovideosink

test-rtsp: ## Testar conexão RTSP (para por 5 segundos)
	@echo "🎬 Testando conexão RTSP por 5 segundos..."
	@echo "Se funcionar, você verá dados sendo recebidos sem erro EOS"
	@(docker-compose -f $(COMPOSE_FILE) exec $(SERVICE_NAME) \
		gst-launch-1.0 rtspsrc location=rtsp://localhost:8554/cam1 ! fakesink &) && \
	sleep 5 && \
	echo "✅ Teste concluído - Stream funcionando!" || \
	echo "❌ Erro no teste"

# Comandos de desenvolvimento
dev-build: ## Build para desenvolvimento (sem cache)
	@echo "🔨 Build de desenvolvimento (sem cache)..."
	docker-compose -f $(COMPOSE_FILE) build --no-cache

dev-up: ## Up para desenvolvimento (com logs)
	@echo "🚀 Iniciando em modo desenvolvimento..."
	docker-compose -f $(COMPOSE_FILE) up

# Comando padrão
all: demo

# Informações sobre o arquivo de vídeo
video-info: ## Mostrar informações do arquivo de vídeo
	@echo "📹 Informações do arquivo de vídeo:"
	@if [ -f $(VIDEO_FILE) ]; then \
		ls -lh $(VIDEO_FILE); \
		echo ""; \
		docker run --rm -v $(PWD)/$(VIDEO_FILE):/video.mp4:ro \
		jrottenberg/ffmpeg:4.4-alpine \
		-i /video.mp4 2>&1 | grep -E "(Stream|Duration)"; \
	else \
		echo "❌ Arquivo $(VIDEO_FILE) não encontrado!"; \
	fi
