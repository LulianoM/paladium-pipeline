# Paladium Pipeline Server - Makefile
# MediaMTX Server para distribuição SRT/HLS/WebRTC

.PHONY: help up down restart logs build rebuild clean status health test demo validate dev

# Configurações
COMPOSE_FILE = docker-compose.yml
PROJECT_NAME = paladium-server
ENV_FILE = .env

# Cores para output
RED = \033[0;31m
GREEN = \033[0;32m
YELLOW = \033[1;33m
BLUE = \033[0;34m
PURPLE = \033[0;35m
CYAN = \033[0;36m
WHITE = \033[1;37m
NC = \033[0m # No Color

# Default target
help: ## 📋 Mostrar este menu de ajuda
	@echo ""
	@echo "$(CYAN)🎬 Paladium Pipeline Server - Comandos Disponíveis$(NC)"
	@echo ""
	@echo "$(WHITE)Comandos Principais:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(WHITE)Exemplos de Uso:$(NC)"
	@echo "  $(YELLOW)make demo$(NC)          # Demo completa (recomendado)"
	@echo "  $(YELLOW)make up$(NC)            # Iniciar servidor"
	@echo "  $(YELLOW)make logs$(NC)          # Ver logs em tempo real"
	@echo "  $(YELLOW)make test-hls$(NC)      # Testar stream HLS"
	@echo ""

##@ 🚀 Comandos Principais

up: ## 🚀 Iniciar servidor MediaMTX e web app
	@echo "$(GREEN)🚀 Iniciando Paladium Pipeline Server...$(NC)"
	@docker compose -f $(COMPOSE_FILE) up -d
	@echo "$(GREEN)✅ Servidor iniciado!$(NC)"
	@echo ""
	@echo "$(CYAN)📡 Endpoints disponíveis:$(NC)"
	@echo "  $(WHITE)Web App (HLS):$(NC)     http://localhost:8080"
	@echo "  $(WHITE)HLS Stream:$(NC)        http://localhost:8888/cam1/index.m3u8"
	@echo "  $(WHITE)WebRTC Player:$(NC)     http://localhost:8554/cam1"
	@echo "  $(WHITE)SRT Stream:$(NC)        srt://localhost:9000?mode=caller&streamid=#!::r=cam1,m=read"
	@echo "  $(WHITE)API MediaMTX:$(NC)      http://localhost:9997"
	@echo ""

down: ## 🛑 Parar todos os serviços
	@echo "$(RED)🛑 Parando Paladium Pipeline Server...$(NC)"
	@docker compose -f $(COMPOSE_FILE) down
	@echo "$(RED)✅ Servidor parado!$(NC)"

restart: down up ## 🔄 Reiniciar servidor

demo: validate build up status ## 🎯 Demo completa (recomendado)
	@echo ""
	@echo "$(CYAN)🎬 Demo do Paladium Pipeline Server$(NC)"
	@echo ""
	@echo "$(WHITE)1. Aguarde a Pipeline 2 publicar via SRT...$(NC)"
	@echo "$(WHITE)2. Abra o navegador: $(YELLOW)http://localhost:8080$(NC)"
	@echo "$(WHITE)3. Clique em 'Iniciar Stream' na interface web$(NC)"
	@echo "$(WHITE)4. Teste outros players:$(NC)"
	@echo "   $(CYAN)VLC:$(NC) vlc srt://localhost:9000?mode=caller&streamid=#!::r=cam1,m=read"
	@echo "   $(CYAN)WebRTC:$(NC) http://localhost:8554/cam1"
	@echo ""
	@echo "$(GREEN)✨ Demo iniciada com sucesso!$(NC)"

##@ 📊 Monitoramento

logs: ## 📋 Ver logs em tempo real
	@docker compose -f $(COMPOSE_FILE) logs -f

logs-mediamtx: ## 📋 Ver logs apenas do MediaMTX
	@docker compose -f $(COMPOSE_FILE) logs -f mediamtx

logs-web: ## 📋 Ver logs apenas do web app
	@docker compose -f $(COMPOSE_FILE) logs -f web

status: ## 📊 Status dos containers
	@echo "$(CYAN)📊 Status dos Containers:$(NC)"
	@docker compose -f $(COMPOSE_FILE) ps
	@echo ""
	@echo "$(CYAN)🔍 Verificação de Saúde:$(NC)"
	@docker compose -f $(COMPOSE_FILE) ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

health: ## 🏥 Verificar saúde dos serviços
	@echo "$(CYAN)🏥 Verificação de Saúde dos Serviços:$(NC)"
	@echo ""
	@echo "$(WHITE)MediaMTX API:$(NC)"
	@curl -s -f http://localhost:9997/v3/config || echo "$(RED)❌ MediaMTX API offline$(NC)"
	@echo ""
	@echo "$(WHITE)Web App:$(NC)"
	@curl -s -f -I http://localhost:8080 > /dev/null && echo "$(GREEN)✅ Web App online$(NC)" || echo "$(RED)❌ Web App offline$(NC)"
	@echo ""
	@echo "$(WHITE)HLS Endpoint:$(NC)"
	@curl -s -f -I http://localhost:8888/cam1/index.m3u8 > /dev/null && echo "$(GREEN)✅ HLS endpoint online$(NC)" || echo "$(RED)❌ HLS endpoint offline$(NC)"

monitor: ## 📈 Monitorar recursos dos containers
	@echo "$(CYAN)📈 Monitoramento de Recursos:$(NC)"
	@docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}" --no-stream

##@ 🔨 Build e Desenvolvimento

build: ## 🔨 Build das imagens Docker
	@echo "$(BLUE)🔨 Building Paladium Pipeline Server...$(NC)"
	@docker compose -f $(COMPOSE_FILE) build

rebuild: clean build ## 🔄 Rebuild completo (limpa cache)
	@echo "$(BLUE)🔄 Rebuild completo finalizado!$(NC)"

dev: ## 🛠️ Modo desenvolvimento (logs visíveis)
	@echo "$(PURPLE)🛠️ Iniciando em modo desenvolvimento...$(NC)"
	@docker compose -f $(COMPOSE_FILE) up --build

dev-build: ## 🛠️ Build sem cache para desenvolvimento
	@echo "$(PURPLE)🛠️ Build sem cache...$(NC)"
	@docker compose -f $(COMPOSE_FILE) build --no-cache

##@ 🧪 Testes

test: test-endpoints test-hls test-srt ## 🧪 Executar todos os testes

test-endpoints: ## 🌐 Testar endpoints HTTP
	@echo "$(CYAN)🌐 Testando Endpoints HTTP...$(NC)"
	@echo "$(WHITE)Web App (8080):$(NC)"
	@curl -s -f -I http://localhost:8080 > /dev/null && echo "  $(GREEN)✅ OK$(NC)" || echo "  $(RED)❌ FAIL$(NC)"
	@echo "$(WHITE)MediaMTX API (9997):$(NC)"
	@curl -s -f http://localhost:9997/v3/config > /dev/null && echo "  $(GREEN)✅ OK$(NC)" || echo "  $(RED)❌ FAIL$(NC)"
	@echo "$(WHITE)HLS Server (8888):$(NC)"
	@curl -s -f -I http://localhost:8888 > /dev/null && echo "  $(GREEN)✅ OK$(NC)" || echo "  $(RED)❌ FAIL$(NC)"

test-hls: ## 📺 Testar stream HLS com ffprobe
	@echo "$(CYAN)📺 Testando Stream HLS...$(NC)"
	@timeout 10 ffprobe -v quiet -show_format -show_streams http://localhost:8888/cam1/index.m3u8 2>/dev/null && \
		echo "$(GREEN)✅ HLS stream disponível$(NC)" || \
		echo "$(YELLOW)⚠️  HLS stream não disponível (normal se não houver publish)$(NC)"

test-srt: ## 📡 Testar disponibilidade SRT
	@echo "$(CYAN)📡 Testando Disponibilidade SRT...$(NC)"
	@nc -z -u localhost 9000 && \
		echo "$(GREEN)✅ Porta SRT (9000) acessível$(NC)" || \
		echo "$(RED)❌ Porta SRT (9000) inacessível$(NC)"

test-webrtc: ## 🌐 Testar WebRTC endpoint
	@echo "$(CYAN)🌐 Testando WebRTC...$(NC)"
	@curl -s -f http://localhost:8554/cam1 > /dev/null && \
		echo "$(GREEN)✅ WebRTC endpoint acessível$(NC)" || \
		echo "$(RED)❌ WebRTC endpoint inacessível$(NC)"

##@ 🧹 Limpeza e Manutenção

clean: ## 🧹 Limpar containers e imagens
	@echo "$(RED)🧹 Limpando containers e imagens...$(NC)"
	@docker compose -f $(COMPOSE_FILE) down --rmi all --volumes --remove-orphans
	@docker system prune -f
	@echo "$(RED)✅ Limpeza concluída!$(NC)"

clean-logs: ## 📝 Limpar logs dos containers
	@echo "$(YELLOW)📝 Limpando logs dos containers...$(NC)"
	@docker compose -f $(COMPOSE_FILE) logs --no-log-prefix > /dev/null 2>&1 || true
	@echo "$(YELLOW)✅ Logs limpos!$(NC)"

clean-recordings: ## 🎥 Limpar gravações antigas
	@echo "$(YELLOW)🎥 Limpando gravações antigas...$(NC)"
	@sudo rm -rf ./recordings/* 2>/dev/null || true
	@echo "$(YELLOW)✅ Gravações limpas!$(NC)"

##@ 🔍 Validação e Informações

validate: ## ✅ Validar pré-requisitos
	@echo "$(CYAN)✅ Validando pré-requisitos...$(NC)"
	@echo "$(WHITE)Docker:$(NC)"
	@docker --version > /dev/null && echo "  $(GREEN)✅ Docker disponível$(NC)" || (echo "  $(RED)❌ Docker não encontrado$(NC)" && exit 1)
	@echo "$(WHITE)Docker Compose:$(NC)"
	@docker compose version > /dev/null && echo "  $(GREEN)✅ Docker Compose disponível$(NC)" || (echo "  $(RED)❌ Docker Compose não encontrado$(NC)" && exit 1)
	@echo "$(WHITE)Portas necessárias:$(NC)"
	@! nc -z localhost 8080 2>/dev/null && echo "  $(GREEN)✅ Porta 8080 (Web) livre$(NC)" || echo "  $(YELLOW)⚠️  Porta 8080 em uso$(NC)"
	@! nc -z localhost 8888 2>/dev/null && echo "  $(GREEN)✅ Porta 8888 (HLS) livre$(NC)" || echo "  $(YELLOW)⚠️  Porta 8888 em uso$(NC)"
	@! nc -z localhost 8554 2>/dev/null && echo "  $(GREEN)✅ Porta 8554 (WebRTC) livre$(NC)" || echo "  $(YELLOW)⚠️  Porta 8554 em uso$(NC)"
	@! nc -z localhost 9000 2>/dev/null && echo "  $(GREEN)✅ Porta 9000 (SRT) livre$(NC)" || echo "  $(YELLOW)⚠️  Porta 9000 em uso$(NC)"
	@echo "$(GREEN)✅ Validação concluída!$(NC)"

info: ## ℹ️  Informações do projeto
	@echo "$(CYAN)ℹ️  Paladium Pipeline Server$(NC)"
	@echo ""
	@echo "$(WHITE)Versão:$(NC) 1.0.0"
	@echo "$(WHITE)Tecnologias:$(NC) MediaMTX, Docker, HLS.js, Nginx"
	@echo "$(WHITE)Protocolos:$(NC) SRT (input), HLS, WebRTC, SRT (output)"
	@echo ""
	@echo "$(WHITE)Estrutura do Projeto:$(NC)"
	@echo "  📁 server/"
	@echo "  ├── 🐳 Dockerfile              # Imagem MediaMTX"
	@echo "  ├── 🐳 docker-compose.yml     # Orquestração"
	@echo "  ├── ⚙️  mediamtx.yml           # Configuração MediaMTX"
	@echo "  ├── 📝 Makefile               # Este arquivo"
	@echo "  ├── 📄 env.example            # Variáveis de ambiente"
	@echo "  ├── 📖 README.md              # Documentação"
	@echo "  └── 🌐 web/                   # Aplicação web"
	@echo "      ├── 📄 index.html"
	@echo "      ├── 🎨 style.css"
	@echo "      └── 📜 app.js"
	@echo ""

urls: ## 🔗 Mostrar URLs de acesso
	@echo "$(CYAN)🔗 URLs de Acesso:$(NC)"
	@echo ""
	@echo "$(WHITE)Interface Web (HLS Player):$(NC)"
	@echo "  $(BLUE)http://localhost:8080$(NC)"
	@echo ""
	@echo "$(WHITE)Streaming Endpoints:$(NC)"
	@echo "  $(GREEN)HLS:$(NC)     http://localhost:8888/cam1/index.m3u8"
	@echo "  $(GREEN)WebRTC:$(NC)  http://localhost:8554/cam1"
	@echo "  $(GREEN)SRT:$(NC)     srt://localhost:9000?mode=caller&streamid=#!::r=cam1,m=read"
	@echo ""
	@echo "$(WHITE)Comandos de Teste:$(NC)"
	@echo "  $(CYAN)VLC (SRT):$(NC)    vlc srt://localhost:9000?mode=caller&streamid=#!::r=cam1,m=read"
	@echo "  $(CYAN)FFplay (HLS):$(NC) ffplay http://localhost:8888/cam1/index.m3u8"
	@echo ""
	@echo "$(WHITE)APIs de Gerenciamento:$(NC)"
	@echo "  $(PURPLE)MediaMTX API:$(NC) http://localhost:9997"
	@echo "  $(PURPLE)Métricas:$(NC)     http://localhost:9998/metrics"
	@echo ""

##@ 🔧 Utilitários

shell-mediamtx: ## 🐚 Shell no container MediaMTX
	@docker compose -f $(COMPOSE_FILE) exec mediamtx sh

shell-web: ## 🐚 Shell no container web
	@docker compose -f $(COMPOSE_FILE) exec web sh

backup-config: ## 💾 Backup das configurações
	@echo "$(BLUE)💾 Fazendo backup das configurações...$(NC)"
	@mkdir -p backups
	@tar -czf backups/paladium-server-config-$(shell date +%Y%m%d_%H%M%S).tar.gz \
		mediamtx.yml docker-compose.yml Makefile env.example web/
	@echo "$(GREEN)✅ Backup criado em backups/$(NC)"

network-info: ## 🌐 Informações da rede Docker
	@echo "$(CYAN)🌐 Informações da Rede Docker:$(NC)"
	@docker network ls | grep paladium || echo "$(YELLOW)⚠️  Rede paladium não encontrada$(NC)"
	@echo ""
	@docker compose -f $(COMPOSE_FILE) ps --format "table {{.Name}}\t{{.Ports}}"
