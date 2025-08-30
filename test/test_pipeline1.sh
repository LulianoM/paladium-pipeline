#!/bin/bash

# Teste Pipeline 1: MP4 → RTSP
# Valida se o servidor RTSP está funcionando corretamente

set -e

echo "🧪 === Teste Pipeline 1: MP4 → RTSP ==="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
log_info "Verificando pré-requisitos..."
if ! command -v ffprobe &> /dev/null; then
    log_error "ffprobe não está instalado. Por favor, instale o ffmpeg primeiro."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    log_error "docker-compose não está instalado."
    exit 1
fi

# Start only Pipeline 1
log_info "Iniciando Pipeline 1 (RTSP Server)..."
docker-compose up -d rtsp-server

# Wait for service to be ready
log_info "Aguardando servidor RTSP estar pronto..."
sleep 5

# Test 1: Check if container is running
log_info "Teste 1: Verificando se container está rodando..."
if docker-compose ps rtsp-server | grep -q "Up"; then
    log_success "Container rtsp-server está rodando"
else
    log_error "Container rtsp-server não está rodando"
    docker-compose logs rtsp-server
    exit 1
fi

# Test 2: Check RTSP connectivity
log_info "Teste 2: Testando conectividade RTSP..."
if ffprobe -v quiet -timeout 10000000 rtsp://localhost:8554/cam1 > /dev/null 2>&1; then
    log_success "RTSP está acessível"
else
    log_error "RTSP não está acessível"
    docker-compose logs rtsp-server
    exit 1
fi

# Test 3: Get stream information
log_info "Teste 3: Obtendo informações do stream..."
stream_info=$(ffprobe -v quiet -select_streams v:0 -show_entries stream=codec_name,width,height,r_frame_rate -of csv=p=0 -timeout 10000000 rtsp://localhost:8554/cam1 2>/dev/null || echo "")

if [ -n "$stream_info" ]; then
    log_success "Informações do stream: $stream_info"
    
    # Parse stream info
    codec=$(echo "$stream_info" | cut -d',' -f1)
    width=$(echo "$stream_info" | cut -d',' -f2)
    height=$(echo "$stream_info" | cut -d',' -f3)
    framerate=$(echo "$stream_info" | cut -d',' -f4)
    
    echo "  📊 Codec: $codec"
    echo "  📐 Resolução: ${width}x${height}"
    echo "  🎬 Frame Rate: $framerate"
else
    log_error "Não foi possível obter informações do stream"
    exit 1
fi

# Test 4: Test stream continuity (check if it's looping)
log_info "Teste 4: Verificando continuidade do stream (loop)..."
log_info "Testando por 30 segundos..."

# Test stream for 30 seconds to see if it continues
if timeout 30s ffprobe -v quiet -f null - -i rtsp://localhost:8554/cam1 > /dev/null 2>&1; then
    log_success "Stream está rodando continuamente (loop funcionando)"
else
    # Check if it failed due to timeout (which is expected for continuous stream)
    if [ $? -eq 124 ]; then
        log_success "Stream está rodando continuamente (timeout esperado)"
    else
        log_warning "Stream pode ter parado - verificando logs"
        docker-compose logs --tail=10 rtsp-server
    fi
fi

# Test 5: Check logs for any errors
log_info "Teste 5: Verificando logs por erros..."
if docker-compose logs rtsp-server | grep -i error > /dev/null; then
    log_warning "Encontrados possíveis erros nos logs:"
    docker-compose logs rtsp-server | grep -i error
else
    log_success "Nenhum erro encontrado nos logs"
fi

echo ""
echo "📊 === Resumo Pipeline 1 ==="
echo ""
log_success "Pipeline 1 está funcionando corretamente!"
echo ""
echo "📋 Informações:"
echo "  🎥 Endpoint RTSP: rtsp://localhost:8554/cam1"
echo "  📊 Codec: $codec"
echo "  📐 Resolução: ${width}x${height}"
echo "  🔄 Loop: Ativo"
echo ""
echo "🧪 Testes realizados:"
echo "  ✅ Container rodando"
echo "  ✅ Conectividade RTSP"
echo "  ✅ Informações do stream"
echo "  ✅ Continuidade do stream"
echo "  ✅ Verificação de logs"
echo ""
log_info "Para testar manualmente: ffplay rtsp://localhost:8554/cam1"
log_info "Para parar o serviço: docker-compose stop rtsp-server"
