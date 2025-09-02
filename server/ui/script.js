class PipelineInterface {
    constructor() {
        this.ws = null;
        this.reconnectInterval = null;
        this.currentService = null;
        this.servicesData = {};
        this.currentTab = 'hls';
        this.hlsPlayer = null;
        this.webrtcPlayer = null;
        
        this.initializeUI();
        this.setupTabNavigation();
        this.initializePlayers();
        this.connectWebSocket();
        this.setupEventListeners();
    }

    initializeUI() {
        this.servicesGrid = document.getElementById('servicesGrid');
        this.lastUpdate = document.getElementById('lastUpdate');
        this.logsOverlay = document.getElementById('logsOverlay');
        this.logsTitle = document.getElementById('logsTitle');
        this.logsContent = document.getElementById('logsContent');
        this.logLines = document.getElementById('logLines');
        this.refreshLogsBtn = document.getElementById('refreshLogs');
        this.closeLogsBtn = document.getElementById('closeLogs');
        
        // Adicionar indicador de conexão
        this.connectionStatus = document.createElement('div');
        this.connectionStatus.className = 'connection-status connection-disconnected';
        this.connectionStatus.innerHTML = '<i class="fas fa-circle"></i> Desconectado';
        document.body.appendChild(this.connectionStatus);
    }

    setupTabNavigation() {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.getAttribute('data-tab');
                
                // Remove active class from all buttons and contents
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                // Add active class to clicked button and corresponding content
                button.classList.add('active');
                document.getElementById(`${targetTab}-tab`).classList.add('active');
                
                this.currentTab = targetTab;
                
                // Initialize players when switching to their tabs
                if (targetTab === 'hls') {
                    this.initializeHLSPlayer();
                } else if (targetTab === 'webrtc') {
                    this.initializeWebRTCPlayer();
                }
            });
        });
    }

    initializePlayers() {
        // Initialize HLS player by default since it's the active tab
        this.initializeHLSPlayer();
    }

    initializeHLSPlayer() {
        const videoElement = document.getElementById('hlsPlayer');
        const statusMessage = document.getElementById('hlsStatus');
        
        if (!videoElement || !statusMessage) return;

        const hlsStreamUrl = 'http://localhost:8080/cam1/index.m3u8';

        // Verifica se o navegador suporta HLS.js
        if (Hls.isSupported()) {
            console.log("HLS.js é suportado. Configurando o player...");

            // Configuração do HLS.js com lógica de retry
            const hlsConfig = {
                manifestLoadErrorMaxRetry: 9,
                manifestLoadRetryDelay: 1000, 
            };

            this.hlsPlayer = new Hls(hlsConfig);
            
            // Anexa o player ao elemento de vídeo
            this.hlsPlayer.attachMedia(videoElement);

            // Evento disparado quando o HLS.js está pronto para carregar a fonte
            this.hlsPlayer.on(Hls.Events.MEDIA_ATTACHED, () => {
                console.log('Player de vídeo anexado, carregando fonte:', hlsStreamUrl);
                this.hlsPlayer.loadSource(hlsStreamUrl);
            });

            // Evento disparado quando o manifesto é carregado e analisado com sucesso
            this.hlsPlayer.on(Hls.Events.MANIFEST_PARSED, () => {
                console.log("Manifesto carregado com sucesso, iniciando o vídeo.");
                statusMessage.textContent = "Stream ao vivo 🔴";
                videoElement.play();
            });

            // Evento para capturar erros e dar feedback
            this.hlsPlayer.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            console.warn("Erro de rede fatal encontrado, tentando se recuperar...");
                            statusMessage.textContent = "Conexão instável. Tentando reconectar...";
                            this.hlsPlayer.startLoad();
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            console.error("Erro de mídia fatal, recuperando...");
                            statusMessage.textContent = "Erro no stream. Tentando recuperar...";
                            this.hlsPlayer.recoverMediaError();
                            break;
                        default:
                            console.error("Erro fatal não recuperável, destruindo HLS.js.", data);
                            statusMessage.textContent = "Erro irrecuperável. Verifique o console.";
                            this.hlsPlayer.destroy();
                            break;
                    }
                }
            });

        } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
            // Suporte nativo para HLS (ex: Safari no iOS/macOS)
            console.log("Usando suporte nativo para HLS.");
            videoElement.src = hlsStreamUrl;
            videoElement.addEventListener('canplay', () => {
                statusMessage.textContent = "Stream ao vivo 🔴";
                videoElement.play();
            });
        } else {
            statusMessage.textContent = "Seu navegador não suporta HLS.";
        }
    }

    initializeWebRTCPlayer() {
        const videoElement = document.getElementById('webrtcPlayer');
        const statusMessage = document.getElementById('webrtcStatus');
        
        if (!videoElement || !statusMessage) return;

        // WebRTC implementation would go here
        // For now, we'll show a placeholder message
        statusMessage.textContent = "WebRTC player não implementado ainda. Esta funcionalidade será adicionada em breve.";
        
        // Placeholder for future WebRTC implementation
        console.log("WebRTC player initialization placeholder");
    }

    setupEventListeners() {
        this.closeLogsBtn.addEventListener('click', () => this.closeLogs());
        this.refreshLogsBtn.addEventListener('click', () => this.refreshLogs());
        this.logLines.addEventListener('change', () => this.refreshLogs());
        
        // Fechar logs ao clicar fora
        this.logsOverlay.addEventListener('click', (e) => {
            if (e.target === this.logsOverlay) {
                this.closeLogs();
            }
        });
        
        // Tecla ESC para fechar logs
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.logsOverlay.classList.contains('show')) {
                this.closeLogs();
            }
        });
    }

    connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.hostname}:3000`;
        
        try {
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                console.log('WebSocket conectado');
                this.updateConnectionStatus(true);
                if (this.reconnectInterval) {
                    clearInterval(this.reconnectInterval);
                    this.reconnectInterval = null;
                }
            };
            
            this.ws.onmessage = (event) => {
                const message = JSON.parse(event.data);
                if (message.type === 'status') {
                    this.updateServicesStatus(message.data);
                }
            };
            
            this.ws.onclose = () => {
                console.log('WebSocket desconectado');
                this.updateConnectionStatus(false);
                this.scheduleReconnect();
            };
            
            this.ws.onerror = (error) => {
                console.error('Erro no WebSocket:', error);
                this.updateConnectionStatus(false);
            };
            
        } catch (error) {
            console.error('Erro ao conectar WebSocket:', error);
            this.updateConnectionStatus(false);
            this.scheduleReconnect();
        }
    }

    scheduleReconnect() {
        if (!this.reconnectInterval) {
            this.reconnectInterval = setInterval(() => {
                console.log('Tentando reconectar WebSocket...');
                this.connectWebSocket();
            }, 5000);
        }
    }

    updateConnectionStatus(connected) {
        if (connected) {
            this.connectionStatus.className = 'connection-status connection-connected';
            this.connectionStatus.innerHTML = '<i class="fas fa-circle"></i> Conectado';
        } else {
            this.connectionStatus.className = 'connection-status connection-disconnected';
            this.connectionStatus.innerHTML = '<i class="fas fa-circle"></i> Desconectado';
        }
    }

    updateServicesStatus(data) {
        this.servicesData = data;
        this.renderServices();
        this.updateLastUpdateTime();
    }

    renderServices() {
        if (!this.servicesGrid) return;
        
        this.servicesGrid.innerHTML = '';
        
        Object.entries(this.servicesData).forEach(([serviceId, service]) => {
            const card = this.createServiceCard(serviceId, service);
            this.servicesGrid.appendChild(card);
        });
    }

    createServiceCard(serviceId, service) {
        const card = document.createElement('div');
        card.className = 'service-card';
        
        const statusClass = this.getStatusClass(service.overall);
        const statusIcon = this.getStatusIcon(service.overall);
        const uptime = this.formatUptime(service.container.uptime);
        
        card.innerHTML = `
            <div class="service-header">
                <div class="service-info">
                    <h3>${service.name}</h3>
                    <p>${service.description}</p>
                </div>
                <div class="status-indicator ${statusClass}">
                    <i class="${statusIcon}"></i>
                    ${service.overall === 'healthy' ? 'Online' : 'Offline'}
                </div>
            </div>
            
            <div class="service-metrics">
                <div class="metric">
                    <div class="metric-label">Porta</div>
                    <div class="metric-value">${service.port}</div>
                </div>
                <div class="metric">
                    <div class="metric-label">Conectividade</div>
                    <div class="metric-value">
                        ${service.connectivity ? 
                            '<i class="fas fa-check" style="color: #000000;"></i> OK' : 
                            '<i class="fas fa-times" style="color: #000000;"></i> Falha'
                        }
                    </div>
                </div>
                <div class="metric">
                    <div class="metric-label">Container</div>
                    <div class="metric-value">${service.container.state}</div>
                </div>
                <div class="metric">
                    <div class="metric-label">Uptime</div>
                    <div class="metric-value">${uptime}</div>
                </div>
            </div>
            
            <div class="service-actions">
                <button class="btn btn-primary" onclick="interface.showLogs('${serviceId}')">
                    <i class="fas fa-file-alt"></i>
                    Ver Logs
                </button>
                <button class="btn btn-secondary" onclick="interface.testEndpoint('${serviceId}')">
                    <i class="fas fa-network-wired"></i>
                    Testar
                </button>
            </div>
        `;
        
        return card;
    }

    getStatusClass(status) {
        switch (status) {
            case 'healthy': return 'status-healthy';
            case 'unhealthy': return 'status-unhealthy';
            default: return 'status-unknown';
        }
    }

    getStatusIcon(status) {
        switch (status) {
            case 'healthy': return 'fas fa-check-circle';
            case 'unhealthy': return 'fas fa-exclamation-triangle';
            default: return 'fas fa-question-circle';
        }
    }

    formatUptime(uptime) {
        if (!uptime) return 'N/A';
        
        const now = new Date();
        const start = new Date(uptime);
        const diff = now - start;
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    }

    updateLastUpdateTime() {
        if (this.lastUpdate) {
            this.lastUpdate.textContent = new Date().toLocaleTimeString('pt-BR');
        }
    }

    async showLogs(serviceId) {
        this.currentService = serviceId;
        const service = this.servicesData[serviceId];
        
        this.logsTitle.textContent = `Logs - ${service.name}`;
        this.logsContent.innerHTML = '<div class="loading">Carregando logs...</div>';
        this.logsOverlay.classList.add('show');
        
        await this.loadLogs();
    }

    async loadLogs() {
        if (!this.currentService) return;
        
        try {
            const lines = this.logLines.value;
            const response = await fetch(`http://localhost:3000/api/logs/${this.currentService}?lines=${lines}`);
            const data = await response.json();
            
            if (response.ok) {
                this.renderLogs(data.logs);
            } else {
                this.logsContent.innerHTML = `<div class="log-error">Erro: ${data.error}</div>`;
            }
        } catch (error) {
            console.error('Erro ao carregar logs:', error);
            this.logsContent.innerHTML = `<div class="log-error">Erro ao carregar logs: ${error.message}</div>`;
        }
    }

    renderLogs(logs) {
        if (!logs || logs.length === 0) {
            this.logsContent.innerHTML = '<div>Nenhum log encontrado.</div>';
            return;
        }
        
        const logsHtml = logs.map(line => {
            let className = 'log-line';
            
            if (line.toLowerCase().includes('error') || line.toLowerCase().includes('erro')) {
                className += ' log-error';
            } else if (line.toLowerCase().includes('warn') || line.toLowerCase().includes('warning')) {
                className += ' log-warn';
            } else if (line.toLowerCase().includes('info')) {
                className += ' log-info';
            }
            
            return `<div class="${className}">${this.escapeHtml(line)}</div>`;
        }).join('');
        
        this.logsContent.innerHTML = logsHtml;
        this.logsContent.scrollTop = this.logsContent.scrollHeight;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async refreshLogs() {
        if (this.currentService) {
            this.logsContent.innerHTML = '<div class="loading">Recarregando logs...</div>';
            await this.loadLogs();
        }
    }

    closeLogs() {
        this.logsOverlay.classList.remove('show');
        this.currentService = null;
    }

    async testEndpoint(serviceId) {
        const service = this.servicesData[serviceId];
        const endpoint = service.healthEndpoint;
        
        alert(`Testando endpoint: ${endpoint}\n\nEste é um exemplo. Em uma implementação real, você pode:\n- Abrir o endpoint em uma nova aba\n- Executar um teste de conectividade\n- Mostrar informações detalhadas`);
    }
}

// Inicializar a interface quando a página carregar
let interface;
document.addEventListener('DOMContentLoaded', () => {
    interface = new PipelineInterface();
});

// Fallback para APIs não disponíveis
if (!window.WebSocket) {
    console.warn('WebSocket não suportado, usando polling HTTP');
    
    // Implementar fallback com polling se necessário
    setInterval(async () => {
        try {
            const response = await fetch('http://localhost:3000/api/status');
            const data = await response.json();
            if (interface) {
                interface.updateServicesStatus(data);
            }
        } catch (error) {
            console.error('Erro no polling:', error);
        }
    }, 10000); // Poll a cada 10 segundos
}
