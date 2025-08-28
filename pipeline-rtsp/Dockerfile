# Use Ubuntu como base para melhor suporte ao GStreamer
FROM ubuntu:22.04

# Evitar prompts interativos durante a instalação
ENV DEBIAN_FRONTEND=noninteractive

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    python3-gi \
    python3-gi-cairo \
    gir1.2-gstreamer-1.0 \
    gir1.2-gst-plugins-base-1.0 \
    gir1.2-gst-rtsp-server-1.0 \
    pkg-config \
    build-essential \
    meson \
    ninja-build \
    libgstreamer1.0-dev \
    libgstreamer-plugins-base1.0-dev \
    libgstreamer-plugins-bad1.0-dev \
    gstreamer1.0-plugins-base \
    gstreamer1.0-plugins-good \
    gstreamer1.0-plugins-bad \
    gstreamer1.0-plugins-ugly \
    gstreamer1.0-libav \
    gstreamer1.0-tools \
    gstreamer1.0-x \
    gstreamer1.0-alsa \
    gstreamer1.0-gl \
    gstreamer1.0-gtk3 \
    gstreamer1.0-qt5 \
    gstreamer1.0-pulseaudio \
    gstreamer1.0-rtsp \
    libgirepository1.0-dev \
    libcairo2-dev \
    libglib2.0-dev \
    && rm -rf /var/lib/apt/lists/*

# Criar diretório de trabalho
WORKDIR /app

# Copiar requirements (apenas para documentação - usando pacotes do sistema)
COPY requirements.txt .

# Copiar código fonte
COPY src/ ./src/

# Criar diretório para vídeos
RUN mkdir -p /app/video

# Expor porta RTSP
EXPOSE 8554

# Configurar variáveis de ambiente
ENV VIDEO_PATH=/app/video/video.mp4
ENV RTSP_PORT=8554
ENV MOUNT_POINT=/cam1

# Comando padrão
CMD ["python3", "src/rtsp_server.py"]
