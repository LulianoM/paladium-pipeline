# RTSP to SRT Pipeline Makefile
# Comandos para gerenciar o pipeline RTSP -> SRT

.PHONY: help build up down logs restart clean demo status health test-full

# Configurações
COMPOSE_FILE = docker-compose.yml
SERVICE_NAME = rtsp-to-srt
RTSP_SERVICE = rtsp-server
VIDEO_FILE = ../video.mp4

help: ## Mostrar esta ajuda
	@echo "RTSP to SRT Pipeline - Comandos Disponíveis:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

validate: ## Validar pré-requisitos antes de iniciar
	@echo "🔍 Validando pré-requisitos..."
	@python3 scripts/validate.py

build: ## Construir a imagem Docker
	@echo "🔨 Construindo imagem Docker..."
	docker-compose -f $(COMPOSE_FILE) build $(SERVICE_NAME)

build-all: ## Construir todas as imagens (incluindo RTSP server)
	@echo "🔨 Construindo todas as imagens..."
	docker-compose -f $(COMPOSE_FILE) --profile test build

up: ## Iniciar apenas o pipeline RTSP->SRT (requer servidor RTSP externo)
	@echo "🚀 Iniciando pipeline RTSP->SRT..."
	@echo "⚠️  Certifique-se de que há um servidor RTSP rodando em rtsp://localhost:8554/cam1"
	docker-compose -f $(COMPOSE_FILE) up -d $(SERVICE_NAME)
	@echo "✅ Pipeline iniciado!"
	@echo "📺 Consumindo de: rtsp://localhost:8554/cam1"
	@echo "📡 Publicando SRT em: srt://127.0.0.1:9999"

up-test: ## Iniciar pipeline completo com servidor RTSP de teste
	@echo "🚀 Iniciando pipeline completo (RTSP server + RTSP->SRT)..."
	@if [ ! -f $(VIDEO_FILE) ]; then \
		echo "❌ Erro: Arquivo $(VIDEO_FILE) não encontrado!"; \
		echo "   Certifique-se de que o arquivo video.mp4 existe no diretório pai."; \
		exit 1; \
	fi
	docker-compose -f $(COMPOSE_FILE) --profile test up -d
	@echo "✅ Pipeline completo iniciado!"
	@echo "📺 RTSP Server: rtsp://localhost:8554/cam1"
	@echo "📡 SRT Output: srt://127.0.0.1:9999"

down: ## Parar o pipeline
	@echo "🛑 Parando pipeline..."
	docker-compose -f $(COMPOSE_FILE) --profile test down
	@echo "✅ Pipeline parado!"

logs: ## Mostrar logs do pipeline
	@echo "📋 Logs do pipeline RTSP->SRT:"
	docker-compose -f $(COMPOSE_FILE) logs -f $(SERVICE_NAME)

logs-all: ## Mostrar logs de todos os serviços
	@echo "📋 Logs de todos os serviços:"
	docker-compose -f $(COMPOSE_FILE) --profile test logs -f

restart: down up-test ## Reiniciar o pipeline completo

clean: ## Limpar containers e imagens
	@echo "🧹 Limpando containers e imagens..."
	docker-compose -f $(COMPOSE_FILE) --profile test down -v --remove-orphans
	docker-compose -f $(COMPOSE_FILE) --profile test down --rmi all
	@echo "✅ Limpeza concluída!"

demo: validate build-all up-test ## Comando único para demo completa
	@echo "🎉 Demo iniciada!"
	@echo ""
	@echo "📺 Pipeline ativo:"
	@echo "   RTSP Input:  rtsp://localhost:8554/cam1"
	@echo "   SRT Output:  srt://127.0.0.1:9999"
	@echo ""
	@echo "🧪 Para testar o SRT output:"
	@echo "   ffplay srt://127.0.0.1:9999"
	@echo "   vlc srt://127.0.0.1:9999"
	@echo ""
	@echo "🔍 Para monitorar:"
	@echo "   make logs     - Ver logs do pipeline"
	@echo "   make logs-all - Ver logs completos"
	@echo "   make status   - Ver status dos containers"
	@echo "   make health   - Verificar saúde dos serviços"
	@echo ""
	@echo "🛑 Para parar:"
	@echo "   make down     - Parar todos os serviços"

status: ## Mostrar status dos containers
	@echo "📊 Status dos containers:"
	docker-compose -f $(COMPOSE_FILE) --profile test ps

health: ## Verificar saúde dos serviços
	@echo "🏥 Verificando saúde dos serviços..."
	@if docker-compose -f $(COMPOSE_FILE) ps | grep -q "Up"; then \
		echo "✅ Serviços estão rodando"; \
		docker-compose -f $(COMPOSE_FILE) exec $(SERVICE_NAME) gst-inspect-1.0 srtclientsink > /dev/null 2>&1 && \
		echo "✅ GStreamer SRT funcionando" || \
		echo "❌ Problema com GStreamer SRT"; \
		docker-compose -f $(COMPOSE_FILE) exec $(RTSP_SERVICE) gst-inspect-1.0 rtspsrc > /dev/null 2>&1 && \
		echo "✅ GStreamer RTSP funcionando" || \
		echo "❌ Problema com GStreamer RTSP"; \
	else \
		echo "❌ Serviços não estão rodando"; \
	fi

dev-shell: ## Abrir shell no container para debug
	@echo "🐚 Abrindo shell no container..."
	docker-compose -f $(COMPOSE_FILE) exec $(SERVICE_NAME) /bin/bash

test-srt: ## Testar saída SRT com gstreamer
	@echo "🧪 Testando saída SRT por 10 segundos..."
	@echo "Se funcionar, você verá dados sendo recebidos sem erro"
	@(docker-compose -f $(COMPOSE_FILE) exec $(SERVICE_NAME) \
		gst-launch-1.0 srtclientsrc uri=srt://127.0.0.1:9999 ! fakesink &) && \
	sleep 10 && \
	echo "✅ Teste SRT concluído!" || \
	echo "❌ Erro no teste SRT"

test-pipeline: ## Testar pipeline completo
	@echo "🧪 Testando pipeline RTSP->SRT completo..."
	@echo "Iniciando teste em background por 15 segundos..."
	@(docker-compose -f $(COMPOSE_FILE) exec $(SERVICE_NAME) \
		gst-launch-1.0 \
		rtspsrc location=rtsp://$(RTSP_SERVICE):8554/cam1 ! \
		rtpjitterbuffer ! rtph264depay ! h264parse ! \
		mpegtsmux ! srtclientsink uri=srt://127.0.0.1:9999 &) && \
	sleep 15 && \
	echo "✅ Teste de pipeline concluído!" || \
	echo "❌ Erro no teste de pipeline"

# Comandos de desenvolvimento
dev-build: ## Build para desenvolvimento (sem cache)
	@echo "🔨 Build de desenvolvimento (sem cache)..."
	docker-compose -f $(COMPOSE_FILE) build --no-cache $(SERVICE_NAME)

dev-up: ## Up para desenvolvimento (com logs)
	@echo "🚀 Iniciando em modo desenvolvimento..."
	docker-compose -f $(COMPOSE_FILE) --profile test up

# Comando padrão
all: demo

# Informações sobre configuração
config: ## Mostrar configuração atual
	@echo "⚙️  Configuração atual:"
	@echo "RTSP URL: $${RTSP_URL:-rtsp://localhost:8554/cam1}"
	@echo "SRT Host: $${SRT_HOST:-127.0.0.1}"
	@echo "SRT Port: $${SRT_PORT:-9999}"
	@echo "SRT Stream ID: $${SRT_STREAMID:-live/stream1}"
	@echo ""
	@echo "Para alterar, defina as variáveis de ambiente ou edite o docker-compose.yml"

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
