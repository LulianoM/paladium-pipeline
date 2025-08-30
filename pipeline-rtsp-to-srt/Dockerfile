# Stage 1: Build the application
FROM rust:1.76 as builder

# Install GStreamer dependencies
RUN apt-get update && apt-get install -y \
    libgstreamer1.0-dev \
    libgstreamer-plugins-base1.0-dev \
    libgstreamer-plugins-bad1.0-dev \
    gstreamer1.0-plugins-base \
    gstreamer1.0-plugins-good \
    gstreamer1.0-plugins-bad \
    gstreamer1.0-plugins-ugly \
    gstreamer1.0-libav \
    pkg-config

WORKDIR /usr/src/rtsp_to_srt
COPY . .
RUN cargo build --release

# Stage 2: Create the runtime image
FROM ubuntu:22.04

# Install only runtime dependencies for GStreamer
RUN apt-get update && apt-get install -y \
    gstreamer1.0-plugins-base \
    gstreamer1.0-plugins-good \
    gstreamer1.0-plugins-bad \
    gstreamer1.0-plugins-ugly \
    gstreamer1.0-libav \
    libgstreamer1.0-0 \
    libgstreamer-plugins-base1.0-0 \
    libgstreamer-plugins-bad1.0-0 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Copy the built application from the builder stage
COPY --from=builder /usr/src/rtsp_to_srt/target/release/rtsp_to_srt .

# Set environment variables
ENV RTSP_URL=rtsp://rtsp-server:8554/cam1
ENV SRT_URL=srt://0.0.0.0:9999?mode=listener

# Expose the SRT port
EXPOSE 9999

# Run the application
CMD ["./rtsp_to_srt"]
