FROM ubuntu:22.04

RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY ffmpeg_bridge.sh .
RUN chmod +x ffmpeg_bridge.sh

CMD ["./ffmpeg_bridge.sh"]