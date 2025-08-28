# Use Ubuntu como base para melhor suporte ao GStreamer e SRT
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
    pkg-config \
    build-essential \
    meson \
    ninja-build \
    cmake \
    git \
    # GStreamer core e plugins
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
    # Dependências para SRT
    libssl-dev \
    libtool \
    libgirepository1.0-dev \
    libcairo2-dev \
    libglib2.0-dev \
    && rm -rf /var/lib/apt/lists/*

# Instalar FFmpeg com suporte SRT como alternativa
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsrt1.4-gnutls \
    && rm -rf /var/lib/apt/lists/*

# Tentar instalar plugins SRT do GStreamer se disponível
RUN apt-get update && apt-get install -y \
    gstreamer1.0-plugins-bad-apps \
    || echo "Plugin SRT não disponível, usando FFmpeg como fallback" \
    && rm -rf /var/lib/apt/lists/*

# Atualizar cache de plugins GStreamer
RUN gst-inspect-1.0 --print-all > /dev/null 2>&1 || true

# Criar diretório de trabalho
WORKDIR /app

# Copiar requirements
COPY requirements.txt .

# Copiar código fonte
COPY src/ ./src/

# Configurar variáveis de ambiente para GStreamer
ENV GST_PLUGIN_PATH=/usr/lib/x86_64-linux-gnu/gstreamer-1.0
ENV GST_DEBUG=2

# Variáveis de ambiente padrão para o pipeline
ENV RTSP_URL=rtsp://localhost:8554/cam1
ENV SRT_HOST=127.0.0.1
ENV SRT_PORT=9999
ENV SRT_STREAMID=""

# Comando padrão
CMD ["python3", "src/rtsp_to_srt.py"]
