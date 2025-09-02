#!/bin/bash

# Paladium Pipeline - Script de Setup
# Este script configura o ambiente para executar o projeto

set -e

echo "🚀 Paladium Pipeline - Setup"
echo "=============================="

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para imprimir mensagens coloridas
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar se Docker está instalado
check_docker() {
    print_status "Verificando Docker..."
    if command -v docker &> /dev/null; then
        DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | cut -d',' -f1)
        print_success "Docker encontrado: $DOCKER_VERSION"
    else
        print_error "Docker não encontrado. Por favor, instale o Docker primeiro."
        echo "Visite: https://docs.docker.com/get-docker/"
        exit 1
    fi
}

# Verificar se Docker Compose está instalado
check_docker_compose() {
    print_status "Verificando Docker Compose..."
    if command -v docker-compose &> /dev/null; then
        COMPOSE_VERSION=$(docker-compose --version | cut -d' ' -f3 | cut -d',' -f1)
        print_success "Docker Compose encontrado: $COMPOSE_VERSION"
    else
        print_error "Docker Compose não encontrado. Por favor, instale o Docker Compose primeiro."
        echo "Visite: https://docs.docker.com/compose/install/"
        exit 1
    fi
}

# Verificar se Docker está rodando
check_docker_running() {
    print_status "Verificando se Docker está rodando..."
    if docker info &> /dev/null; then
        print_success "Docker está rodando"
    else
        print_error "Docker não está rodando. Por favor, inicie o Docker primeiro."
        exit 1
    fi
}

# Verificar arquivos necessários
check_files() {
    print_status "Verificando arquivos necessários..."
    
    REQUIRED_FILES=(
        "docker-compose.yml"
        "pipeline-rtsp/Dockerfile"
        "pipeline-rtsp-to-srt/Dockerfile"
        "server/mediamtx/Dockerfile"
        "server/ui/Dockerfile"
        "pipeline-rtsp/sinners.mp4"
    )
    
    for file in "${REQUIRED_FILES[@]}"; do
        if [ -f "$file" ]; then
            print_success "✓ $file"
        else
            print_error "✗ $file não encontrado"
            exit 1
        fi
    done
}

# Criar arquivo .env se não existir
create_env_file() {
    print_status "Verificando arquivo .env..."
    if [ ! -f ".env" ]; then
        print_warning "Arquivo .env não encontrado. Criando arquivo de exemplo..."
        cat > .env << EOF
# Paladium Pipeline - Variáveis de Ambiente
VIDEO_PATH=./sinners.mp4
RTSP_PORT=8555
HLS_PORT=8080
UI_PORT=8181
DEBUG=false
EOF
        print_success "Arquivo .env criado"
    else
        print_success "Arquivo .env já existe"
    fi
}

# Build das imagens
build_images() {
    print_status "Construindo imagens Docker..."
    
    print_status "Construindo Pipeline 1 (RTSP Server)..."
    docker-compose build pipeline1
    
    print_status "Construindo Pipeline 2 (FFmpeg Bridge)..."
    docker-compose build pipeline2
    
    print_status "Construindo Pipeline 3 (MediaMTX)..."
    docker-compose build pipeline3
    
    print_status "Construindo UI..."
    docker-compose build ui
    
    print_success "Todas as imagens foram construídas com sucesso"
}

# Iniciar serviços
start_services() {
    print_status "Iniciando serviços..."
    docker-compose up -d
    
    print_status "Aguardando serviços iniciarem..."
    sleep 10
    
    print_success "Serviços iniciados"
}

# Verificar se os serviços estão rodando
check_services() {
    print_status "Verificando status dos serviços..."
    
    SERVICES=("pipeline1-rtsp" "pipeline2-rtsp-to-srt" "mediamtx-server" "ui-hls-player")
    
    for service in "${SERVICES[@]}"; do
        if docker ps --format "table {{.Names}}" | grep -q "$service"; then
            STATUS=$(docker ps --format "table {{.Names}}\t{{.Status}}" | grep "$service" | awk '{print $2}')
            print_success "✓ $service: $STATUS"
        else
            print_error "✗ $service não está rodando"
        fi
    done
}

# Testar conectividade
test_connectivity() {
    print_status "Testando conectividade..."
    
    # Aguardar um pouco mais para os serviços estabilizarem
    sleep 15
    
    # Testar RTSP
    print_status "Testando RTSP..."
    if curl -I rtsp://localhost:8555/cam1 &> /dev/null; then
        print_success "✓ RTSP funcionando"
    else
        print_warning "⚠ RTSP não disponível ainda (pode levar alguns segundos)"
    fi
    
    # Testar HLS
    print_status "Testando HLS..."
    if curl -I http://localhost:8080/cam1/index.m3u8 &> /dev/null; then
        print_success "✓ HLS funcionando"
    else
        print_warning "⚠ HLS não disponível ainda (pode levar alguns segundos)"
    fi
    
    # Testar UI
    print_status "Testando UI..."
    if curl -I http://localhost:8181 &> /dev/null; then
        print_success "✓ UI funcionando"
    else
        print_error "✗ UI não disponível"
    fi
}

# Mostrar informações finais
show_final_info() {
    echo ""
    echo "🎉 Setup Concluído!"
    echo "=================="
    echo ""
    echo "📺 Interface Web: http://localhost:8181"
    echo "📡 Stream RTSP: rtsp://localhost:8555/cam1"
    echo "📡 Stream HLS: http://localhost:8080/cam1/index.m3u8"
    echo ""
    echo "🔧 Comandos úteis:"
    echo "  make status     - Ver status dos serviços"
    echo "  make logs       - Ver logs"
    echo "  make down       - Parar serviços"
    echo "  make urls       - Ver todas as URLs"
    echo ""
    echo "📚 Documentação:"
    echo "  README.md       - Documentação completa"
    echo "  COMMANDS.md     - Comandos úteis"
    echo ""
    echo "⚠️  Nota: Pode levar alguns segundos para o stream HLS ficar disponível"
    echo "   Aguarde e tente acessar a interface web em alguns momentos"
}

# Função principal
main() {
    echo "Iniciando setup do Paladium Pipeline..."
    echo ""
    
    check_docker
    check_docker_compose
    check_docker_running
    check_files
    create_env_file
    build_images
    start_services
    check_services
    test_connectivity
    show_final_info
}

# Executar função principal
main "$@"
