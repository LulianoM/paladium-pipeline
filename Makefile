# Paladium Pipeline - Makefile
# Comandos úteis para gerenciar o projeto

.PHONY: help build demo down restart logs status clean test

# Comando padrão
help:
	@echo "Paladium Pipeline - Comandos Disponíveis:"
	@echo ""
	@echo "🚀 Execução:"
	@echo "  make demo        - Iniciar todos os serviços"
	@echo "  make down        - Parar todos os serviços"
	@echo "  make restart     - Reiniciar todos os serviços"
	@echo "  make build       - Build de todos os serviços"
	@echo ""
	@echo "📊 Monitoramento:"
	@echo "  make status      - Ver status dos containers"
	@echo "  make logs        - Ver logs de todos os serviços"
	@echo "  make logs-p1     - Ver logs do Pipeline 1 (RTSP)"
	@echo "  make logs-p2     - Ver logs do Pipeline 2 (FFmpeg)"
	@echo "  make logs-p3     - Ver logs do Pipeline 3 (MediaMTX)"
	@echo "  make logs-ui     - Ver logs da UI"
	@echo ""
	@echo "🔧 Desenvolvimento:"
	@echo "  make build-p1    - Build do Pipeline 1"
	@echo "  make build-p2    - Build do Pipeline 2"
	@echo "  make build-p3    - Build do Pipeline 3"
	@echo "  make build-ui    - Build da UI"
	@echo "  make restart-p1  - Reiniciar Pipeline 1"
	@echo "  make restart-p2  - Reiniciar Pipeline 2"
	@echo "  make restart-p3  - Reiniciar Pipeline 3"
	@echo "  make restart-ui  - Reiniciar UI"
	@echo ""
	@echo "🧹 Limpeza:"
	@echo "  make clean       - Limpar containers e cache"
	@echo "  make clean-all   - Limpeza completa do sistema"
	@echo ""
	@echo "🧪 Testes:"
	@echo "  make test        - Executar testes"
	@echo "  make test-rtsp   - Testar stream RTSP"
	@echo "  make test-hls    - Testar stream HLS"
	@echo ""
	@echo "🌐 URLs:"
	@echo "  make urls        - Mostrar URLs dos serviços"

# Execução
demo:
	@echo "🚀 Iniciando todos os serviços..."
	docker-compose up -d

down:
	@echo "🛑 Parando todos os serviços..."
	docker-compose down

restart:
	@echo "🔄 Reiniciando todos os serviços..."
	docker-compose restart

build:
	@echo "🔨 Build de todos os serviços..."
	docker-compose build

# Monitoramento
status:
	@echo "📊 Status dos containers:"
	docker-compose ps

logs:
	@echo "📋 Logs de todos os serviços:"
	docker-compose logs

logs-p1:
	@echo "📋 Logs do Pipeline 1 (RTSP):"
	docker-compose logs pipeline1

logs-p2:
	@echo "📋 Logs do Pipeline 2 (FFmpeg):"
	docker-compose logs pipeline2

logs-p3:
	@echo "📋 Logs do Pipeline 3 (MediaMTX):"
	docker-compose logs pipeline3

logs-ui:
	@echo "📋 Logs da UI:"
	docker-compose logs ui

# Desenvolvimento
build-p1:
	@echo "🔨 Build do Pipeline 1..."
	docker-compose build pipeline1

build-p2:
	@echo "🔨 Build do Pipeline 2..."
	docker-compose build pipeline2

build-p3:
	@echo "🔨 Build do Pipeline 3..."
	docker-compose build pipeline3

build-ui:
	@echo "🔨 Build da UI..."
	docker-compose build ui

restart-p1:
	@echo "🔄 Reiniciando Pipeline 1..."
	docker-compose restart pipeline1

restart-p2:
	@echo "🔄 Reiniciando Pipeline 2..."
	docker-compose restart pipeline2

restart-p3:
	@echo "🔄 Reiniciando Pipeline 3..."
	docker-compose restart pipeline3

restart-ui:
	@echo "🔄 Reiniciando UI..."
	docker-compose restart ui

# Limpeza
clean:
	@echo "🧹 Limpando containers e cache..."
	docker-compose down
	docker system prune -f

clean-all:
	@echo "🧹 Limpeza completa do sistema..."
	docker-compose down
	docker system prune -af
	docker volume prune -f

# Testes
test:
	@echo "🧪 Executando testes..."
	@if [ -d "test" ]; then \
		cd test && ./run_all_tests.sh; \
	else \
		echo "❌ Diretório de testes não encontrado"; \
	fi

test-rtsp:
	@echo "🧪 Testando stream RTSP..."
	@curl -I rtsp://localhost:8555/cam1 || echo "❌ RTSP não disponível"

test-hls:
	@echo "🧪 Testando stream HLS..."
	@curl -I http://localhost:8080/cam1/index.m3u8 || echo "❌ HLS não disponível"

# URLs
urls:
	@echo "🌐 URLs dos serviços:"
	@echo ""
	@echo "📺 Interface Web:"
	@echo "  http://localhost:8181"
	@echo ""
	@echo "📡 Streams:"
	@echo "  RTSP: rtsp://localhost:8555/cam1"
	@echo "  HLS:  http://localhost:8080/cam1/index.m3u8"
	@echo "  WebRTC: http://localhost:8889/cam1"
	@echo "  RTMP: rtmp://localhost:1935/cam1"
	@echo ""
	@echo "🔧 Serviços:"
	@echo "  MediaMTX: http://localhost:8080"
	@echo "  WebRTC API: http://localhost:8889"
