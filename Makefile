.PHONY: up down logs test-srt test-hls test-webrtc open-ui clean test test-pipeline1 test-pipeline2 test-both test-simple

# Start all 3 pipelines
up:
	docker-compose up -d --build

# Stop all pipelines
down:
	docker-compose down

# Show logs from all services
logs:
	docker-compose logs -f

# Show logs from specific services
logs-rtsp:
	docker-compose logs -f rtsp-server

logs-srt:
	docker-compose logs -f rtsp-to-srt

logs-media:
	docker-compose logs -f media-server

logs-monitor:
	docker-compose logs -f pipeline-monitor

# Test SRT stream from MediaMTX with ffplay
test-srt:
	@echo "Testing MediaMTX SRT stream at srt://localhost:8890..."
	@echo "Make sure all pipelines are running first with 'make up'"
	ffplay -i "srt://localhost:8890?mode=caller&streamid=read:live" -fflags nobuffer -flags low_delay -framedrop

# Test HLS stream with ffplay (requires ffmpeg installed locally)
test-hls:
	@echo "Testing MediaMTX HLS stream at http://localhost:8888/live/index.m3u8..."
	@echo "Make sure all pipelines are running first with 'make up'"
	ffplay -i "http://localhost:8888/live/index.m3u8" -fflags nobuffer -flags low_delay -framedrop

# Test Web Player (opens browser)
test-webrtc:
	@echo "Opening MediaMTX Web Player..."
	@echo "Make sure all pipelines are running first with 'make up'"
	open "http://localhost:8888/web/" || xdg-open "http://localhost:8888/web/" || echo "Please open http://localhost:8888/web/ in your browser"

# Open Web UI
open-ui:
	@echo "Opening Paladium Pipeline Web Interface..."
	open "http://localhost:8888" || xdg-open "http://localhost:8888" || echo "Please open http://localhost:8888 in your browser"

# Open Pipeline Monitor
open-monitor:
	@echo "Opening Pipeline Monitor..."
	open "http://localhost:3000" || xdg-open "http://localhost:3000" || echo "Please open http://localhost:3000 in your browser"

# Open MediaMTX Web Player
open-player:
	@echo "Opening MediaMTX Web Player..."
	open "http://localhost:8888/web/" || xdg-open "http://localhost:8888/web/" || echo "Please open http://localhost:8888/web/ in your browser"

# Test VLC with MediaMTX SRT
test-vlc:
	@echo "🎥 === Testando MediaMTX SRT no VLC ==="
	@echo ""
	@echo "Comando para abrir no VLC:"
	@echo "vlc 'srt://localhost:8890?mode=caller&streamid=read:live'"
	@echo ""
	@echo "Ou via linha de comando:"
	@echo "open -a VLC 'srt://localhost:8890?mode=caller&streamid=read:live'"

# Show status of all services
status:
	@echo "=== Paladium Pipeline Status ==="
	@echo ""
	@echo "Services:"
	@docker-compose ps
	@echo ""
	@echo "Available endpoints:"
	@echo "  🎥 Web Interface: http://localhost:8888"
	@echo "  📊 Pipeline Monitor:  http://localhost:3000"
	@echo "  🎬 MediaMTX Player:   http://localhost:8888/web/"
	@echo "  📡 RTSP Stream:       rtsp://localhost:8554/cam1"
	@echo "  📺 SRT Stream:        srt://localhost:8890?mode=caller&streamid=read:live"
	@echo "  🌐 HLS Stream:        http://localhost:8888/live/index.m3u8"
	@echo "  🔧 MediaMTX API:      http://localhost:9997/v3/paths/list"
	@echo "  📊 MediaMTX Metrics:  http://localhost:9998/metrics"

# Clean up everything
clean:
	docker-compose down -v --rmi all

# === TESTING COMMANDS ===

# Run all tests
test:
	@echo "🧪 === Executando todos os testes ==="
	@echo ""
	./test/run_all_tests.sh

# Test Pipeline 1 only (MP4 → RTSP)
test-pipeline1:
	@echo "🧪 === Testando Pipeline 1: MP4 → RTSP ==="
	@echo ""
	./test/test_pipeline1.sh

# Test Pipeline 2 only (RTSP → SRT)
test-pipeline2:
	@echo "🧪 === Testando Pipeline 2: RTSP → SRT ==="
	@echo ""
	./test/test_pipeline2_standalone.sh

# Test both pipelines integrated
test-both:
	@echo "🧪 === Testando Pipelines 1+2 Integradas ==="
	@echo ""
	./test/test_both_pipelines.sh

# Quick status test
test-simple:
	@echo "🧪 === Teste Simples de Status ==="
	@echo ""
	./test/test_simple.sh

# Test MediaMTX complete (with resilience)
test-mediamtx:
	@echo "🧪 === Teste Completo do MediaMTX ==="
	@echo ""
	./test/test_mediamtx_complete.sh

# Test MediaMTX without resilience test
test-mediamtx-quick:
	@echo "🧪 === Teste Rápido do MediaMTX ==="
	@echo ""
	./test/test_mediamtx_complete.sh --no-resilience

# Test RTSP with VLC command (direct from Pipeline 1)
test-vlc-rtsp:
	@echo "🎥 === Testando RTSP direto no VLC ==="
	@echo ""
	@echo "Comando para abrir no VLC:"
	@echo "vlc rtsp://localhost:8554/cam1"
	@echo ""
	@echo "Ou via linha de comando:"
	@echo "open -a VLC rtsp://localhost:8554/cam1"
