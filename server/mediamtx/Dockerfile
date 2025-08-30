# MediaMTX Dockerfile
# Complete streaming server: SRT input, SRT/WebRTC/HLS output

FROM bluenviron/mediamtx:latest

# Copy custom configuration
COPY mediamtx.yml /mediamtx.yml

# Expose all necessary ports
# RTSP, HLS, WebRTC, SRT, API, Metrics
EXPOSE 8555/tcp
EXPOSE 8888/tcp
EXPOSE 8889/tcp
EXPOSE 8890/udp
EXPOSE 8002/udp
EXPOSE 8003/tcp
EXPOSE 9997/tcp
EXPOSE 9998/tcp

# Use custom configuration (MediaMTX expects just the config file path)
CMD ["/mediamtx.yml"]
