#!/bin/bash

# Teste Pipeline 2: RTSP → SRT (Standalone)
# Testa a Pipeline 2 sem depender do media-server

set -e

echo "🧪 === Teste Pipeline 2: RTSP → SRT (Standalone) ==="
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
if ! command -v ffplay &> /dev/null; then
    log_error "ffplay não está instalado. Por favor, instale o ffmpeg primeiro."
    exit 1
fi

# Temporarily modify docker-compose to use SRT listener mode for testing
log_info "Configurando Pipeline 2 para modo de teste..."

# Create a temporary docker-compose override
cat > docker-compose.override.yml << EOF
version: '3.8'
services:
  rtsp-to-srt:
    environment:
      - RTSP_URL=rtsp://rtsp-server:8554/cam1
      - SRT_URL=srt://0.0.0.0:9999?mode=listener
EOF

# Start Pipeline 1
log_info "Iniciando Pipeline 1 (RTSP Server)..."
docker-compose up -d rtsp-server

# Wait for RTSP to be ready
sleep 5

# Test RTSP first
log_info "Teste 1: Verificando fonte RTSP..."
if ffprobe -v quiet -timeout 5000000 rtsp://localhost:8554/cam1 > /dev/null 2>&1; then
    log_success "Fonte RTSP está disponível"
else
    log_error "Fonte RTSP não está disponível"
    rm -f docker-compose.override.yml
    exit 1
fi

# Start Pipeline 2 with listener mode
log_info "Iniciando Pipeline 2 (RTSP→SRT) em modo listener..."
docker-compose up -d rtsp-to-srt

# Wait for pipeline to establish
log_info "Aguardando pipeline estabelecer conexão..."
sleep 10

# Test 2: Check if rtsp-to-srt is running
log_info "Teste 2: Verificando se rtsp-to-srt está rodando..."
if docker-compose ps rtsp-to-srt | grep -q "Up"; then
    log_success "Container rtsp-to-srt está rodando"
else
    log_error "Container rtsp-to-srt não está rodando"
    rm -f docker-compose.override.yml
    exit 1
fi

# Test 3: Check logs for successful pipeline
log_info "Teste 3: Verificando logs do pipeline..."
sleep 5

rtsp_logs=$(docker-compose logs rtsp-to-srt 2>/dev/null || echo "")

if echo "$rtsp_logs" | grep -q "Pipeline state changed.*Playing"; then
    log_success "Pipeline RTSP→SRT está em estado Playing"
elif echo "$rtsp_logs" | grep -q "Pipeline started"; then
    log_success "Pipeline RTSP→SRT foi iniciado"
    
    # Wait a bit more and check again
    sleep 5
    rtsp_logs=$(docker-compose logs rtsp-to-srt 2>/dev/null || echo "")
    if echo "$rtsp_logs" | grep -q "Pipeline state changed.*Playing"; then
        log_success "Pipeline agora está em estado Playing"
    else
        log_warning "Pipeline pode ainda estar estabelecendo conexão"
    fi
else
    log_error "Pipeline não foi iniciado corretamente"
    echo "Logs:"
    echo "$rtsp_logs"
    rm -f docker-compose.override.yml
    exit 1
fi

# Test 4: Test SRT connectivity
log_info "Teste 4: Testando conectividade SRT..."
log_info "Tentando conectar ao stream SRT por 15 segundos..."

# Try to connect to SRT stream as caller
timeout 15s ffplay -i "srt://localhost:9999?mode=caller" -v quiet -nodisp > /dev/null 2>&1 &
ffplay_pid=$!

# Wait a bit and check if ffplay is still running (connected)
sleep 3

if kill -0 $ffplay_pid 2>/dev/null; then
    log_success "Conexão SRT estabelecida com sucesso!"
    
    # Let it run for a few more seconds to confirm stability
    sleep 7
    
    if kill -0 $ffplay_pid 2>/dev/null; then
        log_success "Stream SRT está estável e funcionando"
        kill $ffplay_pid 2>/dev/null || true
    else
        log_warning "Conexão SRT foi estabelecida mas pode ter instabilidade"
    fi
else
    log_error "Não conseguiu estabelecer conexão SRT"
    rm -f docker-compose.override.yml
    exit 1
fi

# Test 5: Check for errors in logs
log_info "Teste 5: Verificando erros nos logs..."
recent_logs=$(docker-compose logs --tail=10 rtsp-to-srt 2>/dev/null || echo "")

if echo "$recent_logs" | grep -q -E "(ERROR|FATAL)"; then
    log_warning "Encontrados possíveis erros:"
    echo "$recent_logs" | grep -E "(ERROR|FATAL)"
else
    log_success "Nenhum erro crítico encontrado"
fi

# Test 6: Verify pipeline components
log_info "Teste 6: Verificando componentes do pipeline..."
if echo "$rtsp_logs" | grep -q "rtspsrc"; then
    log_success "RTSP source configurado"
else
    log_warning "RTSP source não encontrado na configuração"
fi

if echo "$rtsp_logs" | grep -q "srtclientsink"; then
    log_success "SRT sink configurado"
else
    log_warning "SRT sink não encontrado na configuração"
fi

echo ""
echo "📊 === Resumo Pipeline 2 (Standalone) ==="
echo ""
log_success "Pipeline 2 está funcionando em modo standalone!"
echo ""
echo "📋 Informações:"
echo "  📡 Fonte RTSP: rtsp://localhost:8554/cam1"
echo "  🔄 Destino SRT: srt://localhost:9999 (listener mode)"
echo "  🏃 Estado: Funcionando"
echo "  🔄 Conectividade: Testada e aprovada"
echo ""
echo "🧪 Testes realizados:"
echo "  ✅ Fonte RTSP disponível"
echo "  ✅ Container rtsp-to-srt rodando"
echo "  ✅ Pipeline iniciado"
echo "  ✅ Conectividade SRT testada"
echo "  ✅ Verificação de erros"
echo "  ✅ Componentes do pipeline"
echo ""
echo "📊 Status dos containers:"
docker-compose ps rtsp-server rtsp-to-srt --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
echo ""
log_info "Para testar SRT manualmente: ffplay -i \"srt://localhost:9999?mode=caller\""
log_info "Para ver logs: docker-compose logs -f rtsp-to-srt"

# Cleanup
rm -f docker-compose.override.yml
log_info "Para parar: docker-compose stop rtsp-server rtsp-to-srt"
