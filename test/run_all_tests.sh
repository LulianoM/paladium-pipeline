#!/bin/bash

# Paladium Pipeline - Test Suite Master
# Executa todos os testes disponíveis

set -e

echo "🧪 === Paladium Pipeline - Suite de Testes Completa ==="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
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

log_header() {
    echo -e "${CYAN}🔸 $1${NC}"
}

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_TESTS=()

# Function to run a test
run_test() {
    local test_name="$1"
    local test_script="$2"
    local description="$3"
    
    echo ""
    log_header "=== $test_name ==="
    echo "$description"
    echo ""
    
    if ./$test_script; then
        log_success "$test_name passou!"
        ((TESTS_PASSED++))
    else
        log_error "$test_name falhou!"
        ((TESTS_FAILED++))
        FAILED_TESTS+=("$test_name")
    fi
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# Change to test directory
cd "$(dirname "$0")"

log_info "Iniciando suite completa de testes..."
log_info "Diretório de testes: $(pwd)"
echo ""

# Test 1: Pipeline 1 (MP4 → RTSP)
run_test "Teste Pipeline 1" \
         "test_pipeline1.sh" \
         "Testa o servidor RTSP que converte MP4 para stream RTSP em loop"

# Test 2: Pipeline 2 Standalone (RTSP → SRT)
run_test "Teste Pipeline 2 Standalone" \
         "test_pipeline2_standalone.sh" \
         "Testa a conversão RTSP → SRT em modo standalone"

# Test 3: Ambas Pipelines Integradas
run_test "Teste Integração Pipeline 1+2" \
         "test_both_pipelines.sh" \
         "Testa ambas pipelines funcionando em conjunto"

# Test 4: Teste Simples (verificação rápida)
run_test "Teste Simples" \
         "test_simple.sh" \
         "Verificação rápida do status de todos os componentes"

echo ""
echo "🏁 === Resumo Final da Suite de Testes ==="
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    log_success "🎉 TODOS OS TESTES PASSARAM!"
    echo ""
    echo "✅ Testes executados: $TESTS_PASSED"
    echo "❌ Testes falharam: $TESTS_FAILED"
    echo ""
    log_success "Sistema está 100% funcional!"
else
    log_warning "⚠️  ALGUNS TESTES FALHARAM"
    echo ""
    echo "✅ Testes passaram: $TESTS_PASSED"
    echo "❌ Testes falharam: $TESTS_FAILED"
    echo ""
    echo "Testes que falharam:"
    for failed_test in "${FAILED_TESTS[@]}"; do
        echo "  • $failed_test"
    done
    echo ""
    log_warning "Verifique os logs acima para detalhes dos erros."
fi

echo ""
echo "📊 Componentes testados:"
echo "  🎥 Pipeline 1: MP4 → RTSP"
echo "  🔄 Pipeline 2: RTSP → SRT" 
echo "  🔗 Integração: Pipeline 1 + 2"
echo "  ⚡ Verificação rápida de status"
echo ""
echo "🛠️  Comandos úteis:"
echo "  📋 Ver logs: docker-compose logs -f"
echo "  🛑 Parar tudo: make down"
echo "  🚀 Iniciar: make up"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    exit 0
else
    exit 1
fi
