# Multi-stage build for MediaMTX Server
FROM alpine:3.18 as downloader

# Download MediaMTX latest release
RUN apk add --no-cache curl
WORKDIR /tmp
RUN curl -L https://github.com/bluenviron/mediamtx/releases/download/v1.8.5/mediamtx_v1.8.5_linux_amd64.tar.gz | tar -xz

# Final image
FROM alpine:3.18

# Install dependencies
RUN apk add --no-cache \
    ca-certificates \
    tzdata \
    ffmpeg

# Create non-root user
RUN addgroup -g 1001 mediamtx && \
    adduser -D -u 1001 -G mediamtx mediamtx

# Copy MediaMTX binary
COPY --from=downloader /tmp/mediamtx /usr/local/bin/mediamtx
RUN chmod +x /usr/local/bin/mediamtx

# Create directories
RUN mkdir -p /app/recordings && \
    chown -R mediamtx:mediamtx /app

# Switch to non-root user
USER mediamtx
WORKDIR /app

# Copy configuration
COPY --chown=mediamtx:mediamtx mediamtx.yml /app/mediamtx.yml

# Expose ports
# 8554: WebRTC HTTP
# 8888: HLS
# 9000: SRT
# 9997: API
# 9998: Metrics
# 8000-8001: WebRTC UDP/TCP
EXPOSE 8554 8888 9000 9997 9998 8000 8001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:9997/ || exit 1

# Start MediaMTX
CMD ["/usr/local/bin/mediamtx", "/app/mediamtx.yml"]
