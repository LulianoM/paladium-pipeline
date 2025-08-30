#!/bin/bash

# Complete MediaMTX Test Script
# Tests all functionality: SRT input, SRT/WebRTC/HLS output, resilience

set -e

echo "🧪 === Teste Completo do MediaMTX ==="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Function to print colored output
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

print_test() {
    echo -e "${PURPLE}[TEST]${NC} $1"
}

# Function to check if a service is running
check_service() {
    local service_name=$1
    local container_pattern=$2
    
    print_status "Verificando serviço: $service_name"
    
    if docker-compose ps | grep -q "$container_pattern.*Up"; then
        print_success "$service_name está rodando"
        return 0
    else
        print_error "$service_name não está rodando"
        return 1
    fi
}

# Function to check port connectivity
check_port() {
    local port=$1
    local protocol=${2:-tcp}
    local host=${3:-localhost}
    local timeout=${4:-5}
    
    print_status "Testando porta $port ($protocol) em $host"
    
    if timeout $timeout bash -c "echo >/dev/$protocol/$host/$port" 2>/dev/null; then
        print_success "Porta $port está acessível"
        return 0
    else
        print_warning "Porta $port não está acessível"
        return 1
    fi
}

# Function to check HTTP endpoint
check_http() {
    local url=$1
    local description=$2
    local timeout=${3:-10}
    
    print_status "Testando endpoint: $description"
    print_status "URL: $url"
    
    if timeout $timeout curl -s -f "$url" > /dev/null 2>&1; then
        print_success "$description está respondendo"
        return 0
    else
        print_warning "$description não está respondendo"
        return 1
    fi
}

# Function to test SRT stream
test_srt_stream() {
    local srt_url=$1
    local stream_name=$2
    local timeout=${3:-15}
    
    print_status "Testando stream SRT: $stream_name"
    print_status "URL: $srt_url"
    
    if timeout $timeout ffprobe -v quiet -print_format json -show_streams "$srt_url" > /dev/null 2>&1; then
        print_success "Stream SRT $stream_name está funcionando"
        return 0
    else
        print_warning "Stream SRT $stream_name não está disponível"
        return 1
    fi
}

# Function to check MediaMTX paths
check_mediamtx_paths() {
    print_status "Verificando paths do MediaMTX"
    
    local api_url="http://localhost:9997/v3/paths/list"
    
    if curl -s -f "$api_url" > /tmp/mediamtx_paths.json 2>/dev/null; then
        if grep -q "live" /tmp/mediamtx_paths.json 2>/dev/null; then
            print_success "Path 'live' encontrado no MediaMTX"
            return 0
        else
            print_warning "Path 'live' não encontrado (stream pode não estar ativo)"
            return 1
        fi
    else
        print_error "Não foi possível acessar API de paths do MediaMTX"
        return 1
    fi
}

# Function to test resilience by stopping/starting rtsp-server
test_resilience() {
    print_test "=== TESTE DE RESILIÊNCIA ==="
    echo ""
    
    print_status "Parando Pipeline 1 (RTSP Server) para testar resiliência..."
    docker-compose stop rtsp-server
    
    print_status "Aguardando 10 segundos..."
    sleep 10
    
    print_status "Verificando se Pipeline 2 continua tentando reconectar..."
    if docker-compose logs --tail=20 rtsp-to-srt | grep -q "retry\|Retrying"; then
        print_success "Pipeline 2 está tentando reconectar (comportamento esperado)"
    else
        print_warning "Pipeline 2 pode não estar tentando reconectar"
    fi
    
    print_status "Reiniciando Pipeline 1..."
    docker-compose start rtsp-server
    
    print_status "Aguardando 15 segundos para reconexão..."
    sleep 15
    
    print_status "Verificando se Pipeline 2 reconectou..."
    if docker-compose logs --tail=10 rtsp-to-srt | grep -q "Pipeline started\|Creating pipeline"; then
        print_success "Pipeline 2 reconectou com sucesso!"
        return 0
    else
        print_warning "Pipeline 2 pode não ter reconectado ainda"
        return 1
    fi
}

# Function to analyze docker logs
analyze_logs() {
    print_test "=== ANÁLISE DE LOGS ==="
    echo ""
    
    print_status "Analisando logs da Pipeline 2..."
    local pipeline2_logs=$(docker-compose logs --tail=20 rtsp-to-srt)
    
    if echo "$pipeline2_logs" | grep -q "Pipeline started"; then
        print_success "Pipeline 2: Pipeline iniciado com sucesso"
    fi
    
    if echo "$pipeline2_logs" | grep -q "error\|Error\|ERROR"; then
        print_warning "Pipeline 2: Erros detectados nos logs"
        echo "$pipeline2_logs" | grep -i error | tail -3
    fi
    
    print_status "Analisando logs do MediaMTX..."
    local mediamtx_logs=$(docker-compose logs --tail=20 media-server)
    
    if echo "$mediamtx_logs" | grep -q "SRT.*publish"; then
        print_success "MediaMTX: SRT publish detectado"
    fi
    
    if echo "$mediamtx_logs" | grep -q "error\|Error\|ERROR"; then
        print_warning "MediaMTX: Erros detectados nos logs"
        echo "$mediamtx_logs" | grep -i error | tail -3
    fi
}

# Main test execution
echo "Iniciando teste completo do MediaMTX..."
echo ""

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0

# Test 1: Check if all services are running
print_test "=== TESTE 1: Verificação de Serviços ==="
echo ""

TOTAL_TESTS=$((TOTAL_TESTS + 3))

if check_service "RTSP Server" "rtsp-server"; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
fi

if check_service "RTSP-to-SRT" "rtsp-to-srt"; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
fi

if check_service "MediaMTX" "media-server"; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
fi

echo ""

# Test 2: Check MediaMTX endpoints
print_test "=== TESTE 2: Verificação de Endpoints MediaMTX ==="
echo ""

TOTAL_TESTS=$((TOTAL_TESTS + 5))

if check_port 8888; then  # HLS
    PASSED_TESTS=$((PASSED_TESTS + 1))
fi

if check_port 8889; then  # WebRTC
    PASSED_TESTS=$((PASSED_TESTS + 1))
fi

if check_port 9997; then  # API
    PASSED_TESTS=$((PASSED_TESTS + 1))
fi

if check_http "http://localhost:9997/v3/config/global/get" "MediaMTX API"; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
fi

if check_http "http://localhost:9998/metrics" "MediaMTX Metrics"; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
fi

echo ""

# Test 3: Check streaming endpoints
print_test "=== TESTE 3: Verificação de Streams ==="
echo ""

TOTAL_TESTS=$((TOTAL_TESTS + 3))

# Wait for streams to stabilize
print_status "Aguardando streams estabilizarem (15 segundos)..."
sleep 15

if test_srt_stream "srt://localhost:8890?mode=caller&streamid=read:live" "MediaMTX SRT Read"; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
fi

if check_http "http://localhost:8888/live/index.m3u8" "HLS Stream"; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
fi

if check_mediamtx_paths; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
fi

echo ""

# Test 4: Log analysis
analyze_logs
echo ""

# Test 5: Resilience test (optional, can be skipped with --no-resilience)
if [[ "$1" != "--no-resilience" ]]; then
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    print_status "Executando teste de resiliência (pode ser pulado com --no-resilience)..."
    if test_resilience; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
    fi
    echo ""
fi

# Summary
print_test "=== RESUMO DOS TESTES ==="
echo ""

print_status "Testes executados: $PASSED_TESTS/$TOTAL_TESTS"

if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
    print_success "🎉 TODOS OS TESTES PASSARAM!"
    echo ""
    echo "✅ Sistema funcionando perfeitamente!"
    echo ""
    echo "📺 Endpoints disponíveis:"
    echo "   • SRT (VLC):    srt://localhost:8890?mode=caller&streamid=read:live"
    echo "   • HLS (Browser): http://localhost:8888/live/index.m3u8"
    echo "   • Web Player:   http://localhost:8888/web/"
    echo "   • API:          http://localhost:9997/v3/paths/list"
    echo "   • Metrics:      http://localhost:9998/metrics"
    echo ""
    exit 0
elif [ $PASSED_TESTS -gt $((TOTAL_TESTS * 7 / 10)) ]; then
    print_warning "⚠️ MAIORIA DOS TESTES PASSOU ($PASSED_TESTS/$TOTAL_TESTS)"
    echo ""
    echo "Sistema funcionando com algumas limitações."
    exit 0
else
    print_error "❌ MUITOS TESTES FALHARAM ($PASSED_TESTS/$TOTAL_TESTS)"
    echo ""
    echo "Para debugar:"
    echo "  🔍 Logs completos:     docker-compose logs"
    echo "  🔍 Logs MediaMTX:      docker-compose logs media-server"
    echo "  🔍 Logs Pipeline 2:    docker-compose logs rtsp-to-srt"
    echo "  🔍 Status serviços:    docker-compose ps"
    echo ""
    exit 1
fi
