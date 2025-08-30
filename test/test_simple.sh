#!/bin/bash

echo "🧪 === Teste Simples do Pipeline ==="
echo ""

# Test 1: RTSP
echo "1. Testando RTSP..."
if ffprobe -v quiet -timeout 5000000 rtsp://localhost:8554/cam1 > /dev/null 2>&1; then
    echo "✅ RTSP funcionando"
else
    echo "❌ RTSP não funcionando"
fi

# Test 2: Web Interface
echo "2. Testando Interface Web..."
if curl -s http://localhost:8888 | grep -q "Paladium Pipeline"; then
    echo "✅ Interface Web funcionando"
else
    echo "❌ Interface Web não funcionando"
fi

# Test 3: MediaMTX API
echo "3. Testando MediaMTX API..."
if curl -s --max-time 5 http://localhost:9997/v3/config > /dev/null 2>&1; then
    echo "✅ MediaMTX API funcionando"
else
    echo "❌ MediaMTX API não funcionando"
fi

# Test 4: SRT Connection (check logs)
echo "4. Verificando conexão SRT..."
if docker-compose logs --tail=10 media-server | grep -q "is publishing to path 'live'"; then
    echo "✅ SRT stream ativo"
else
    echo "❌ SRT stream não ativo"
fi

# Test 5: HLS Generation
echo "5. Testando geração HLS..."
# Force HLS request and check if muxer is created
curl -s http://localhost:8888/hls/live/index.m3u8 > /dev/null 2>&1 &
sleep 2
if docker-compose logs --tail=5 media-server | grep -q "HLS.*muxer.*created"; then
    echo "✅ HLS muxer sendo criado"
else
    echo "❌ HLS muxer não criado"
fi

echo ""
echo "📊 Status dos containers:"
docker-compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "🌐 Endpoints para testar:"
echo "  Interface Web: http://localhost:8888"
echo "  RTSP: rtsp://localhost:8554/cam1"
echo "  HLS: http://localhost:8888/hls/live/index.m3u8"
echo ""
echo "💡 Dica: Abra http://localhost:8888 no navegador para testar HLS e WebRTC!"
