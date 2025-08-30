.PHONY: up down logs test-srt clean

# Start both pipelines
up:
	docker-compose up -d --build

# Stop both pipelines
down:
	docker-compose down

# Show logs from both services
logs:
	docker-compose logs -f

# Show logs from specific services
logs-rtsp:
	docker-compose logs -f rtsp-server

logs-srt:
	docker-compose logs -f rtsp-to-srt

# Test SRT stream with ffplay (requires ffmpeg installed locally)
test-srt:
	@echo "Testing SRT stream at srt://localhost:9999..."
	@echo "Make sure both pipelines are running first with 'make up'"
	ffplay -i "srt://localhost:9999?mode=caller" -fflags nobuffer -flags low_delay -framedrop

# Clean up everything
clean:
	docker-compose down -v --rmi all
