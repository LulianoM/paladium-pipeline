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

# Test SRT stream with ffplay (requires ffmpeg installed locally)
test-srt:
	@echo "Testing SRT stream at srt://localhost:9999..."
	@echo "Make sure all pipelines are running first with 'make up'"
	ffplay -i "srt://localhost:9999?mode=caller" -fflags nobuffer -flags low_delay -framedrop

# Test HLS stream with ffplay (requires ffmpeg installed locally)
test-hls:
	@echo "Testing HLS stream at http://localhost:8888/hls/live/index.m3u8..."
	@echo "Make sure all pipelines are running first with 'make up'"
	ffplay -i "http://localhost:8888/hls/live/index.m3u8" -fflags nobuffer -flags low_delay -framedrop

# Test WebRTC (opens browser)
test-webrtc:
	@echo "Opening Web Interface..."
	@echo "Make sure all pipelines are running first with 'make up'"
	open "http://localhost:8888" || xdg-open "http://localhost:8888" || echo "Please open http://localhost:8888 in your browser"

# Open Web UI
open-ui:
	@echo "Opening Paladium Pipeline Web Interface..."
	open "http://localhost:8888" || xdg-open "http://localhost:8888" || echo "Please open http://localhost:8888 in your browser"

# Show status of all services
status:
	@echo "=== Paladium Pipeline Status ==="
	@echo ""
	@echo "Services:"
	@docker-compose ps
	@echo ""
	@echo "Available endpoints:"
	@echo "  🎥 Web Interface: http://localhost:8888"
	@echo "  📡 RTSP Stream:   rtsp://localhost:8554/cam1"
	@echo "  🔄 SRT Stream:    srt://localhost:9999?mode=caller"
	@echo "  🌐 HLS Stream:    http://localhost:8888/hls/live/index.m3u8"
	@echo "  📺 HLS Player:    http://localhost:8888 (use web interface)"

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

# Test RTSP with VLC command
test-vlc:
	@echo "🎥 === Testando RTSP no VLC ==="
	@echo ""
	@echo "Comando para abrir no VLC:"
	@echo "vlc rtsp://localhost:8554/cam1"
	@echo ""
	@echo "Ou via linha de comando:"
	@echo "open -a VLC rtsp://localhost:8554/cam1"
