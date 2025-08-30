.PHONY: up down logs clean

up:
	docker-compose up -d --build

down:
	docker-compose down

logs:
	docker-compose logs -f

logs-rtsp:
	docker-compose logs -f rtsp-server

logs-srt:
	docker-compose logs -f rtsp-to-srt

clean:
	docker-compose down -v --rmi all
