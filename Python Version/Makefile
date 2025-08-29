# Paladium Pipeline Makefile
# Gerencia o pipeline completo: RTSP Server + RTSP-to-SRT

.PHONY: help build up down logs restart clean demo status health test-full validate

# Configurações
COMPOSE_FILE = docker-compose.yml
RTSP_SERVICE = rtsp-server
SRT_SERVICE = rtsp-to-srt
VIDEO_FILE = video.mp4

help: ## Mostrar esta ajuda
	@echo "Paladium Pipeline - Comandos Disponíveis:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

validate: ## Validar pré-requisitos antes de iniciar
	@echo "🔍 Validando pré-requisitos do pipeline completo..."
	@echo "📋 Validando pipeline RTSP..."
	@cd pipeline-rtsp && python3 scripts/validate.py
	@echo ""
	@echo "📋 Validando pipeline RTSP-to-SRT..."
	@cd pipeline-rtsp-to-srt && python3 scripts/validate.py

build: ## Construir todas as imagens Docker
	@echo "🔨 Construindo todas as imagens Docker..."
	docker-compose -f $(COMPOSE_FILE) build
	@echo "✅ Build concluído!"

build-rtsp: ## Construir apenas imagem RTSP
	@echo "🔨 Construindo imagem RTSP..."
	docker-compose -f $(COMPOSE_FILE) build $(RTSP_SERVICE)

build-srt: ## Construir apenas imagem RTSP-to-SRT
	@echo "🔨 Construindo imagem RTSP-to-SRT..."
	docker-compose -f $(COMPOSE_FILE) build $(SRT_SERVICE)

up: ## Iniciar pipeline completo
	@echo "🚀 Iniciando pipeline completo..."
	@if [ ! -f $(VIDEO_FILE) ]; then \
		echo "❌ Erro: Arquivo $(VIDEO_FILE) não encontrado!"; \
		echo "   Certifique-se de que o arquivo video.mp4 existe no diretório raiz."; \
		exit 1; \
	fi
	docker-compose -f $(COMPOSE_FILE) up -d
	@echo "✅ Pipeline iniciado!"
	@echo ""
	@echo "📺 RTSP Server: rtsp://localhost:8554/cam1"
	@echo "📡 SRT Output: srt://localhost:9999"
	@echo ""
	@echo "🧪 Para testar:"
	@echo "   VLC RTSP: rtsp://localhost:8554/cam1"
	@echo "   VLC SRT:  srt://localhost:9999"
	@echo "   FFplay:   ffplay srt://localhost:9999"

up-rtsp: ## Iniciar apenas servidor RTSP
	@echo "🚀 Iniciando apenas servidor RTSP..."
	@if [ ! -f $(VIDEO_FILE) ]; then \
		echo "❌ Erro: Arquivo $(VIDEO_FILE) não encontrado!"; \
		exit 1; \
	fi
	docker-compose -f $(COMPOSE_FILE) up -d $(RTSP_SERVICE)
	@echo "✅ Servidor RTSP iniciado!"
	@echo "📺 URL: rtsp://localhost:8554/cam1"

down: ## Parar pipeline completo
	@echo "🛑 Parando pipeline completo..."
	docker-compose -f $(COMPOSE_FILE) down
	@echo "✅ Pipeline parado!"

logs: ## Mostrar logs de todos os serviços
	@echo "📋 Logs do pipeline completo:"
	docker-compose -f $(COMPOSE_FILE) logs -f

logs-rtsp: ## Mostrar logs apenas do servidor RTSP
	@echo "📋 Logs do servidor RTSP:"
	docker-compose -f $(COMPOSE_FILE) logs -f $(RTSP_SERVICE)

logs-srt: ## Mostrar logs apenas do pipeline RTSP-to-SRT
	@echo "📋 Logs do pipeline RTSP-to-SRT:"
	docker-compose -f $(COMPOSE_FILE) logs -f $(SRT_SERVICE)

restart: down up ## Reiniciar pipeline completo

clean: ## Limpar containers, volumes e imagens
	@echo "🧹 Limpando containers, volumes e imagens..."
	docker-compose -f $(COMPOSE_FILE) down -v --remove-orphans
	docker-compose -f $(COMPOSE_FILE) down --rmi all
	@echo "✅ Limpeza concluída!"

demo: validate build up ## Demo completa (validate + build + up)
	@echo "🎉 Demo do Paladium Pipeline iniciada!"
	@echo ""
	@echo "🔄 Fluxo do Pipeline:"
	@echo "   MP4 → RTSP Server → RTSP-to-SRT → SRT Output"
	@echo ""
	@echo "📺 Endpoints disponíveis:"
	@echo "   RTSP: rtsp://localhost:8554/cam1"
	@echo "   SRT:  srt://localhost:9999"
	@echo ""
	@echo "🧪 Comandos de teste:"
	@echo "   make test-rtsp  - Testar saída RTSP"
	@echo "   make test-srt   - Testar saída SRT"
	@echo "   make test-full  - Testar pipeline completo"
	@echo ""
	@echo "🔍 Monitoramento:"
	@echo "   make status     - Status dos containers"
	@echo "   make health     - Verificar saúde dos serviços"
	@echo "   make logs       - Ver logs em tempo real"
	@echo ""
	@echo "🛑 Para parar:"
	@echo "   make down       - Parar pipeline"

status: ## Mostrar status dos containers
	@echo "📊 Status do pipeline:"
	docker-compose -f $(COMPOSE_FILE) ps

health: ## Verificar saúde dos serviços
	@echo "🏥 Verificando saúde dos serviços..."
	@echo ""
	@echo "📺 RTSP Server:"
	@if docker-compose -f $(COMPOSE_FILE) ps $(RTSP_SERVICE) | grep -q "Up"; then \
		echo "  ✅ Container rodando"; \
		docker-compose -f $(COMPOSE_FILE) exec $(RTSP_SERVICE) gst-inspect-1.0 rtspsrc > /dev/null 2>&1 && \
		echo "  ✅ GStreamer RTSP funcionando" || \
		echo "  ❌ Problema com GStreamer RTSP"; \
	else \
		echo "  ❌ Container não está rodando"; \
	fi
	@echo ""
	@echo "📡 RTSP-to-SRT:"
	@if docker-compose -f $(COMPOSE_FILE) ps $(SRT_SERVICE) | grep -q "Up"; then \
		echo "  ✅ Container rodando"; \
		(docker-compose -f $(COMPOSE_FILE) exec $(SRT_SERVICE) gst-inspect-1.0 srtsink > /dev/null 2>&1 && \
		echo "  ✅ GStreamer SRT funcionando") || \
		(docker-compose -f $(COMPOSE_FILE) exec $(SRT_SERVICE) ffmpeg -version > /dev/null 2>&1 && \
		echo "  ✅ FFmpeg SRT funcionando") || \
		echo "  ❌ Problema com SRT"; \
	else \
		echo "  ❌ Container não está rodando"; \
	fi

test-rtsp: ## Testar saída RTSP
	@echo "🧪 Testando saída RTSP por 10 segundos..."
	@echo "Se funcionar, você verá dados sendo processados"
	@(docker-compose -f $(COMPOSE_FILE) exec $(RTSP_SERVICE) \
		gst-launch-1.0 rtspsrc location=rtsp://localhost:8554/cam1 ! fakesink &) && \
	sleep 10 && pkill -f "gst-launch-1.0" > /dev/null 2>&1 || true && \
	echo "✅ Teste RTSP concluído!"

test-srt: ## Testar saída SRT
	@echo "🧪 Testando saída SRT por 10 segundos..."
	@echo "Se funcionar, você verá dados sendo recebidos"
	@if command -v gst-launch-1.0 >/dev/null 2>&1; then \
		(gst-launch-1.0 srtclientsrc uri=srt://localhost:9999 ! fakesink &) && \
		sleep 10 && pkill -f "srtclientsrc" > /dev/null 2>&1 || true; \
	else \
		echo "⚠️  GStreamer não instalado no macOS, testando com FFmpeg..."; \
		(ffplay -i srt://localhost:9999 -nodisp -autoexit -t 10 &) > /dev/null 2>&1 || \
		echo "💡 Para testar manualmente: vlc srt://localhost:9999"; \
	fi
	@echo "✅ Teste SRT concluído!"

test-full: ## Testar pipeline completo
	@echo "🧪 Testando pipeline completo..."
	@echo "Verificando conectividade RTSP → SRT"
	@echo "Teste executando por 15 segundos..."
	@if command -v gst-launch-1.0 >/dev/null 2>&1; then \
		(gst-launch-1.0 \
			rtspsrc location=rtsp://localhost:8554/cam1 ! \
			rtpjitterbuffer ! rtph264depay ! h264parse ! \
			mpegtsmux ! srtsink uri=srt://localhost:9999?mode=caller &) && \
		sleep 15 && pkill -f "rtspsrc" > /dev/null 2>&1 || true; \
	else \
		echo "⚠️  GStreamer não instalado no macOS"; \
		echo "💡 Para testar manualmente:"; \
		echo "   Terminal 1: vlc rtsp://localhost:8554/cam1"; \
		echo "   Terminal 2: vlc srt://localhost:9999"; \
	fi
	@echo "✅ Teste de pipeline completo concluído!"

# Comandos de desenvolvimento
dev-shell-rtsp: ## Abrir shell no container RTSP
	@echo "🐚 Abrindo shell no container RTSP..."
	docker-compose -f $(COMPOSE_FILE) exec $(RTSP_SERVICE) /bin/bash

dev-shell-srt: ## Abrir shell no container RTSP-to-SRT
	@echo "🐚 Abrindo shell no container RTSP-to-SRT..."
	docker-compose -f $(COMPOSE_FILE) exec $(SRT_SERVICE) /bin/bash

dev-build: ## Build para desenvolvimento (sem cache)
	@echo "🔨 Build de desenvolvimento (sem cache)..."
	docker-compose -f $(COMPOSE_FILE) build --no-cache

dev-up: ## Up para desenvolvimento (com logs)
	@echo "🚀 Iniciando em modo desenvolvimento..."
	docker-compose -f $(COMPOSE_FILE) up

# Comando padrão
all: demo

test-manual: ## Instruções para teste manual no macOS
	@echo "🧪 Testes Manuais no macOS:"
	@echo ""
	@echo "📺 Teste RTSP (abra em um terminal):"
	@echo "   vlc rtsp://localhost:8554/cam1"
	@echo "   # ou"
	@echo "   ffplay rtsp://localhost:8554/cam1"
	@echo ""
	@echo "📡 Teste SRT (abra em outro terminal):"
	@echo "   vlc srt://localhost:9999"
	@echo "   # ou"
	@echo "   ffplay srt://localhost:9999"
	@echo ""
	@echo "🔍 Verificar se está funcionando:"
	@echo "   make status    # Ver status dos containers"
	@echo "   make logs      # Ver logs em tempo real"
	@echo ""
	@echo "💡 Dica: Se o VLC não conectar imediatamente, aguarde alguns segundos"
	@echo "     O pipeline pode demorar um pouco para estabilizar"

# Informações
config: ## Mostrar configuração atual
	@echo "⚙️  Configuração do Paladium Pipeline:"
	@echo ""
	@echo "📁 Arquivo de vídeo: $(VIDEO_FILE)"
	@if [ -f $(VIDEO_FILE) ]; then \
		echo "   ✅ Arquivo encontrado"; \
		ls -lh $(VIDEO_FILE); \
	else \
		echo "   ❌ Arquivo não encontrado"; \
	fi
	@echo ""
	@echo "📺 RTSP Server:"
	@echo "   Porta: 8554"
	@echo "   URL: rtsp://localhost:8554/cam1"
	@echo ""
	@echo "📡 SRT Output:"
	@echo "   Porta: 9999"
	@echo "   URL: srt://localhost:9999"
	@echo "   Stream ID: live/paladium-stream"

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
		echo "   Coloque um arquivo video.mp4 no diretório raiz do projeto."; \
	fi

network-info: ## Mostrar informações da rede Docker
	@echo "🌐 Informações da rede Docker:"
	@docker network ls | grep paladium || echo "Rede não criada ainda"
	@echo ""
	@echo "Para inspecionar a rede:"
	@echo "  docker network inspect paladium-pipeline-network"

# Monitoramento avançado
monitor: ## Monitorar recursos dos containers
	@echo "📊 Monitorando recursos dos containers..."
	@echo "Pressione Ctrl+C para parar"
	docker stats $(shell docker-compose -f $(COMPOSE_FILE) ps -q)

# Backup e restore
backup-logs: ## Fazer backup dos logs
	@echo "💾 Fazendo backup dos logs..."
	@mkdir -p logs-backup
	docker-compose -f $(COMPOSE_FILE) logs $(RTSP_SERVICE) > logs-backup/rtsp-$(shell date +%Y%m%d-%H%M%S).log
	docker-compose -f $(COMPOSE_FILE) logs $(SRT_SERVICE) > logs-backup/srt-$(shell date +%Y%m%d-%H%M%S).log
	@echo "✅ Logs salvos em logs-backup/"
