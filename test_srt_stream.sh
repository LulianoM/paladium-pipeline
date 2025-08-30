#!/bin/bash

echo "=== Teste da Pipeline RTSP → SRT ==="
echo ""

# Verificar se os serviços estão rodando
echo "1. Verificando se os serviços estão rodando..."
docker-compose ps

echo ""
echo "2. Verificando logs dos serviços..."
echo "--- Logs do RTSP Server ---"
docker-compose logs --tail=10 rtsp-server
echo ""
echo "--- Logs do RTSP to SRT ---"
docker-compose logs --tail=10 rtsp-to-srt

echo ""
echo "3. Testando conectividade..."

# Testar se a porta RTSP está aberta
echo "Testando porta RTSP (8554)..."
nc -z localhost 8554 && echo "✓ Porta RTSP 8554 está acessível" || echo "✗ Porta RTSP 8554 não está acessível"

# Testar se a porta SRT está aberta
echo "Testando porta SRT (9999)..."
nc -z localhost 9999 && echo "✓ Porta SRT 9999 está acessível" || echo "✗ Porta SRT 9999 não está acessível"

echo ""
echo "4. Instruções para teste manual:"
echo "   Para testar o stream RTSP:"
echo "   vlc rtsp://localhost:8554/cam1"
echo ""
echo "   Para testar o stream SRT:"
echo "   ffplay -i 'srt://localhost:9999?mode=caller' -fflags nobuffer -flags low_delay -framedrop"
echo ""
echo "   Ou use: make test-srt"
echo ""

echo "=== Fim do teste ==="
