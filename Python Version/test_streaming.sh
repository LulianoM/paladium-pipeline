#!/bin/bash

echo "🔍 Testando Pipeline de Streaming Paladium"
echo "=========================================="
echo ""

echo "📊 Status dos containers:"
docker-compose ps
echo ""

echo "🔗 Testando endpoints:"
echo ""

echo "1️⃣ HLS Manifest (index.m3u8):"
if curl -s -f "http://localhost:8888/cam1/index.m3u8" > /dev/null; then
    echo "✅ HLS Manifest disponível"
    curl -s "http://localhost:8888/cam1/index.m3u8"
else
    echo "❌ HLS Manifest não disponível"
fi
echo ""

echo "2️⃣ HLS Stream (stream.m3u8):"
if curl -s -f "http://localhost:8888/cam1/stream.m3u8" > /dev/null; then
    echo "✅ HLS Stream disponível"
    curl -s "http://localhost:8888/cam1/stream.m3u8" | head -20
else
    echo "❌ HLS Stream não disponível"
fi
echo ""

echo "3️⃣ MediaMTX API:"
if curl -s -f "http://localhost:9997/v3/paths/list" > /dev/null; then
    echo "✅ MediaMTX API disponível"
    curl -s "http://localhost:9997/v3/paths/list" | head -10
else
    echo "❌ MediaMTX API não disponível"
fi
echo ""

echo "4️⃣ Web App:"
if curl -s -f "http://localhost:8080/" > /dev/null; then
    echo "✅ Web App disponível em: http://localhost:8080"
else
    echo "❌ Web App não disponível"
fi
echo ""

echo "📋 Últimos logs dos containers:"
echo ""
echo "🎥 RTSP Server:"
docker-compose logs --tail=5 rtsp-server
echo ""
echo "🔄 RTSP to SRT:"
docker-compose logs --tail=5 rtsp-to-srt
echo ""
echo "📡 MediaMTX:"
docker-compose logs --tail=5 mediamtx-server
echo ""

echo "✨ Teste concluído!"
echo ""
echo "🌐 Para testar no navegador:"
echo "   - Interface Web: http://localhost:8080"
echo "   - HLS Stream: http://localhost:8888/cam1/index.m3u8"
echo ""
echo "🎮 Para testar com VLC:"
echo "   vlc http://localhost:8888/cam1/index.m3u8"
echo ""
