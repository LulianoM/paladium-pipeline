# Stage 1: Build the application
FROM rust:1.82 as builder

# Install GStreamer dependencies
RUN apt-get update && apt-get install -y \
    libgstreamer1.0-dev \
    libgstreamer-plugins-base1.0-dev \
    gstreamer1.0-plugins-base \
    gstreamer1.0-plugins-good \
    gstreamer1.0-plugins-bad \
    gstreamer1.0-plugins-ugly \
    gstreamer1.0-libav \
    libgstrtspserver-1.0-dev \
    pkg-config

WORKDIR /usr/src/pipeline-rtsp
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
    libgstrtspserver-1.0-0 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Copy the built application from the builder stage
COPY --from=builder /usr/src/pipeline-rtsp/target/release/rtsp_server .

# Copy the video file
COPY sinners.mp4 .

# Set the environment variable for the video path
ENV VIDEO_PATH=./sinners.mp4

# Expose the RTSP port
EXPOSE 8554

# Run the server
CMD ["./rtsp_server"]