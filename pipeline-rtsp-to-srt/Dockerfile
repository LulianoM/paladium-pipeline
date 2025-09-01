# Stage 1: Build the application
FROM rust:1.82 as builder

# Install GStreamer development dependencies
# The 'gstreamer1.0-srt' package is included in 'gstreamer1.0-plugins-bad'
RUN apt-get update && apt-get install -y \
    libgstreamer1.0-dev \
    libgstreamer-plugins-base1.0-dev \
    gstreamer1.0-plugins-good \
    gstreamer1.0-plugins-bad \
    libgstrtspserver-1.0-dev \
    pkg-config

WORKDIR /usr/src/pipeline-rtsp-to-srt
COPY . .
RUN cargo build --release

# Stage 2: Create the runtime image
FROM ubuntu:22.04

# Install GStreamer runtime dependencies
# The 'gstreamer1.0-srt' package is included in 'gstreamer1.0-plugins-bad'
RUN apt-get update && apt-get install -y \
    gstreamer1.0-plugins-base \
    gstreamer1.0-plugins-good \
    gstreamer1.0-plugins-bad \
    libgstreamer1.0-0 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /usr/src/pipeline-rtsp-to-srt/target/release/pipeline-rtsp-to-srt .

CMD ["./pipeline-rtsp-to-srt"]