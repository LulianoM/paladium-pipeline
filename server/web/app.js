// Paladium Pipeline Server - JavaScript Application
class PaladiumPlayer {
    constructor() {
        this.hls = null;
        this.video = document.getElementById('video');
        this.streamPath = 'cam1';
        this.serverHost = 'localhost';
        this.ports = {
            hls: 8888,
            srt: 9000,
            webrtc: 8554
        };
        
        this.init();
    }

    init() {
        // Initialize event listeners
        this.setupEventListeners();
        
        // Update URLs on page load
        this.updateUrls();
        
        // Check initial status
        this.checkStatus();
        
        // Auto-check status every 30 seconds
        setInterval(() => this.checkStatus(), 30000);
        
        console.log('🎬 Paladium Player initialized');
    }

    setupEventListeners() {
        // Video events
        this.video.addEventListener('loadstart', () => this.updateStreamStatus('Carregando...', 'checking'));
        this.video.addEventListener('canplay', () => this.updateStreamStatus('Pronto', 'online'));
        this.video.addEventListener('playing', () => this.updateStreamStatus('Reproduzindo', 'online'));
        this.video.addEventListener('pause', () => this.updateStreamStatus('Pausado', 'offline'));
        this.video.addEventListener('ended', () => this.updateStreamStatus('Finalizado', 'offline'));
        this.video.addEventListener('error', (e) => {
            console.error('Video error:', e);
            this.updateStreamStatus('Erro', 'offline');
        });

        // Input changes
        document.getElementById('streamPath').addEventListener('input', (e) => {
            this.streamPath = e.target.value || 'cam1';
            this.updateUrls();
        });

        document.getElementById('serverHost').addEventListener('input', (e) => {
            this.serverHost = e.target.value || 'localhost';
            this.updateUrls();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') return;
            
            switch(e.key) {
                case ' ':
                    e.preventDefault();
                    this.video.paused ? this.startStream() : this.video.pause();
                    break;
                case 'm':
                case 'M':
                    this.toggleMute();
                    break;
                case 'r':
                case 'R':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.updateUrls();
                    }
                    break;
            }
        });
    }

    updateUrls() {
        const hlsUrl = `http://${this.serverHost}:${this.ports.hls}/${this.streamPath}/index.m3u8`;
        const srtUrl = `srt://${this.serverHost}:${this.ports.srt}?mode=caller&streamid=#!::r=${this.streamPath},m=read`;
        const webrtcUrl = `http://${this.serverHost}:${this.ports.webrtc}/${this.streamPath}`;
        const vlcCommand = `vlc ${srtUrl}`;
        const ffplayCommand = `ffplay ${hlsUrl}`;

        // Update URL displays
        document.getElementById('hlsUrl').textContent = hlsUrl;
        document.getElementById('srtUrl').textContent = srtUrl;
        document.getElementById('webrtcUrl').textContent = webrtcUrl;
        document.getElementById('vlcCommand').textContent = vlcCommand;
        document.getElementById('ffplayCommand').textContent = ffplayCommand;

        console.log('📡 URLs updated for stream:', this.streamPath);
    }

    async startStream() {
        try {
            this.updateStreamStatus('Conectando...', 'checking');
            
            const hlsUrl = `http://${this.serverHost}:${this.ports.hls}/${this.streamPath}/index.m3u8`;
            
            // First, try to "wake up" the HLS muxer by making a request
            try {
                await fetch(hlsUrl, { method: 'HEAD' });
                console.log('HLS muxer wake-up request sent');
            } catch (e) {
                console.log('HLS muxer wake-up failed, continuing anyway...');
            }
            
            // Wait a moment for muxer to initialize
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Destroy existing HLS instance
            if (this.hls) {
                this.hls.destroy();
                this.hls = null;
            }

            // Check if HLS.js is supported
            if (Hls.isSupported()) {
                this.hls = new Hls({
                    debug: false,
                    enableWorker: true,
                    lowLatencyMode: true,
                    backBufferLength: 90,
                    maxBufferLength: 30,
                    maxMaxBufferLength: 60,
                    maxBufferSize: 60 * 1000 * 1000,
                    maxBufferHole: 0.5,
                    highBufferWatchdogPeriod: 2,
                    nudgeOffset: 0.1,
                    nudgeMaxRetry: 3,
                    maxFragLookUpTolerance: 0.25,
                    liveSyncDurationCount: 3,
                    liveMaxLatencyDurationCount: 10,
                    liveDurationInfinity: true,
                    manifestLoadingTimeOut: 10000,
                    manifestLoadingMaxRetry: 3,
                    manifestLoadingRetryDelay: 1000,
                    levelLoadingTimeOut: 10000,
                    levelLoadingMaxRetry: 3,
                    levelLoadingRetryDelay: 1000,
                    fragLoadingTimeOut: 20000,
                    fragLoadingMaxRetry: 6,
                    fragLoadingRetryDelay: 1000
                });

                // HLS event listeners
                this.hls.on(Hls.Events.MEDIA_ATTACHED, () => {
                    console.log('📺 Video attached to HLS');
                });

                this.hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
                    console.log('📋 Manifest parsed, levels:', data.levels.length);
                    this.video.play().catch(e => console.warn('Autoplay prevented:', e));
                });

                this.hls.on(Hls.Events.ERROR, (event, data) => {
                    console.error('HLS Error:', data);
                    if (data.fatal) {
                        switch (data.type) {
                            case Hls.ErrorTypes.NETWORK_ERROR:
                                console.log('Network error, trying to recover...');
                                this.updateStreamStatus('Reconectando...', 'checking');
                                setTimeout(() => {
                                    if (this.hls) {
                                        this.hls.startLoad();
                                    }
                                }, 1000);
                                break;
                            case Hls.ErrorTypes.MEDIA_ERROR:
                                console.log('Media error, trying to recover...');
                                this.updateStreamStatus('Recuperando...', 'checking');
                                setTimeout(() => {
                                    if (this.hls) {
                                        this.hls.recoverMediaError();
                                    }
                                }, 1000);
                                break;
                            default:
                                console.log('Fatal error, will retry in 5 seconds...');
                                this.updateStreamStatus('Erro - Tentando novamente...', 'offline');
                                setTimeout(() => {
                                    this.startStream();
                                }, 5000);
                                break;
                        }
                    }
                });

                this.hls.on(Hls.Events.FRAG_LOADED, () => {
                    if (this.video.paused) {
                        this.video.play().catch(e => console.warn('Play failed:', e));
                    }
                });

                // Load and attach
                this.hls.loadSource(hlsUrl);
                this.hls.attachMedia(this.video);
                
            } else if (this.video.canPlayType('application/vnd.apple.mpegurl')) {
                // Native HLS support (Safari)
                this.video.src = hlsUrl;
                this.video.addEventListener('canplay', () => {
                    this.video.play().catch(e => console.warn('Autoplay prevented:', e));
                });
            } else {
                throw new Error('HLS não suportado neste navegador');
            }

            console.log('🚀 Stream started:', hlsUrl);
            
        } catch (error) {
            console.error('Failed to start stream:', error);
            this.updateStreamStatus('Erro: ' + error.message, 'offline');
            this.showNotification('Erro ao iniciar stream: ' + error.message, 'error');
        }
    }

    stopStream() {
        try {
            // Stop video
            this.video.pause();
            this.video.currentTime = 0;
            
            // Destroy HLS
            if (this.hls) {
                this.hls.destroy();
                this.hls = null;
            }
            
            // Clear video source
            this.video.src = '';
            this.video.load();
            
            this.updateStreamStatus('Parado', 'offline');
            console.log('⏹️ Stream stopped');
            
        } catch (error) {
            console.error('Failed to stop stream:', error);
            this.showNotification('Erro ao parar stream: ' + error.message, 'error');
        }
    }

    toggleMute() {
        this.video.muted = !this.video.muted;
        const muteBtn = document.getElementById('muteBtn');
        muteBtn.textContent = this.video.muted ? '🔇 Mudo' : '🔊 Som';
        console.log('🔊 Mute toggled:', this.video.muted);
    }

    async checkStatus() {
        const statusElements = {
            hls: document.getElementById('hlsStatus').querySelector('.status-value'),
            webrtc: document.getElementById('webrtcStatus').querySelector('.status-value')
        };

        // Check HLS endpoint
        try {
            const hlsUrl = `http://${this.serverHost}:${this.ports.hls}/${this.streamPath}/index.m3u8`;
            const response = await fetch(hlsUrl, { 
                method: 'HEAD',
                timeout: 5000,
                signal: AbortSignal.timeout(5000)
            });
            
            if (response.ok) {
                this.updateStatus(statusElements.hls, 'Online', 'online');
            } else {
                this.updateStatus(statusElements.hls, 'Offline', 'offline');
            }
        } catch (error) {
            this.updateStatus(statusElements.hls, 'Offline', 'offline');
        }

        // Check WebRTC endpoint
        try {
            const webrtcUrl = `http://${this.serverHost}:8554/${this.streamPath}`;
            const response = await fetch(webrtcUrl, {
                method: 'HEAD',
                timeout: 5000,
                signal: AbortSignal.timeout(5000)
            });
            
            if (response.ok) {
                this.updateStatus(statusElements.webrtc, 'Online', 'online');
            } else {
                this.updateStatus(statusElements.webrtc, 'Offline', 'offline');
            }
        } catch (error) {
            this.updateStatus(statusElements.webrtc, 'Offline', 'offline');
        }
    }

    updateStatus(element, text, status) {
        element.textContent = text;
        element.className = `status-value ${status}`;
    }

    updateStreamStatus(text, status) {
        const element = document.getElementById('streamStatus').querySelector('.status-value');
        this.updateStatus(element, text, status);
    }

    showNotification(message, type = 'info') {
        // Simple notification system
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            z-index: 1000;
            max-width: 400px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            background: ${type === 'error' ? '#dc2626' : type === 'success' ? '#059669' : '#2563eb'};
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }
}

// Global functions for HTML onclick handlers
function updateUrls() {
    const streamPath = document.getElementById('streamPath').value || 'cam1';
    const serverHost = document.getElementById('serverHost').value || 'localhost';
    
    window.player.streamPath = streamPath;
    window.player.serverHost = serverHost;
    window.player.updateUrls();
    window.player.showNotification('URLs atualizadas!', 'success');
}

function startStream() {
    window.player.startStream();
}

function stopStream() {
    window.player.stopStream();
}

function toggleMute() {
    window.player.toggleMute();
}

function copyUrl(elementId) {
    const element = document.getElementById(elementId);
    const text = element.textContent;
    
    navigator.clipboard.writeText(text).then(() => {
        window.player.showNotification('URL copiada!', 'success');
    }).catch(err => {
        console.error('Failed to copy:', err);
        window.player.showNotification('Erro ao copiar URL', 'error');
    });
}

function openWebRTC() {
    const webrtcUrl = document.getElementById('webrtcUrl').textContent;
    window.open(webrtcUrl, '_blank');
}

function checkStatus() {
    window.player.checkStatus();
    window.player.showNotification('Status verificado!', 'info');
}

// CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Initialize player when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.player = new PaladiumPlayer();
    console.log('🎬 Paladium Pipeline Server Web App loaded');
});
