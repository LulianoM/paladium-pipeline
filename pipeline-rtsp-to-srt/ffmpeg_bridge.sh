#!/bin/bash

echo "🔗 Iniciando ponte RTSP -> SRT com FFmpeg"
echo "🔗 Conectando RTSP: rtsp://pipeline1:8555/cam1"
echo "🔗 Conectando SRT: srt://pipeline3:8888?mode=caller&streamid=publish:cam1"

while true; do
    echo "🕒 Tentando conectar ao stream RTSP..."
    
    ffmpeg -fflags +genpts -avoid_negative_ts make_zero -analyzeduration 1000000 -probesize 1000000 \
           -i rtsp://pipeline1:8555/cam1 \
           -c copy \
           -f mpegts \
           -muxrate 2M \
           -pcr_period 20 \
           srt://pipeline3:8888?mode=caller\&streamid=publish:cam1
    
    echo "⚠️ Conexão perdida. Reconectando em 5 segundos..."
    sleep 5
done
