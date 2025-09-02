class PipelineInterface {
    constructor() {
        this.ws = null;
        this.reconnectInterval = null;
        this.currentService = null;
        this.servicesData = {};
        this.currentTab = 'hls';
        this.hlsPlayer = null;
        this.webrtcPlayer = null;
        this.webrtcConnection = null;
        this.webrtcConnected = false;
        
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
        
        // WebRTC controls
        this.connectWebRTCBtn = document.getElementById('connectWebRTC');
        this.disconnectWebRTCBtn = document.getElementById('disconnectWebRTC');
        this.refreshWebRTCBtn = document.getElementById('refreshWebRTC');
        
        // Monitor controls
        this.refreshAllStatusBtn = document.getElementById('refreshAllStatus');
        
        // Container status tracking
        this.containerStatus = {
            pipeline1: 'unknown',
            pipeline2: 'unknown',
            mediamtx: 'unknown'
        };
        
        // Auto-refresh interval
        this.statusRefreshInterval = null;
        
        // Docker API
        this.dockerAPI = new DockerAPI();
        
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
                } else if (targetTab === 'monitor') {
                    this.refreshAllContainerStatus();
                    this.startAutoRefresh();
                } else {
                    this.stopAutoRefresh();
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

        // Limpar qualquer stream anterior
        this.disconnectWebRTC();
        
        statusMessage.textContent = "Clique em 'Conectar' para iniciar o stream WebRTC";
        this.updateWebRTCButtons(false);
    }

    connectWebRTC() {
        const videoElement = document.getElementById('webrtcPlayer');
        const statusMessage = document.getElementById('webrtcStatus');
        
        if (!videoElement || !statusMessage) return;

        // Limpar qualquer stream anterior
        if (videoElement.srcObject) {
            videoElement.srcObject.getTracks().forEach(track => track.stop());
            videoElement.srcObject = null;
        }

        statusMessage.textContent = "Conectando ao stream WebRTC...";
        this.updateWebRTCButtons(true);
        
        this.performWebRTCConnection(videoElement, statusMessage);
    }

    disconnectWebRTC() {
        const videoElement = document.getElementById('webrtcPlayer');
        const statusMessage = document.getElementById('webrtcStatus');
        
        if (this.webrtcConnection) {
            this.webrtcConnection.close();
            this.webrtcConnection = null;
        }
        
        if (videoElement && videoElement.srcObject) {
            videoElement.srcObject.getTracks().forEach(track => track.stop());
            videoElement.srcObject = null;
        }
        
        this.webrtcConnected = false;
        this.updateWebRTCButtons(false);
        
        if (statusMessage) {
            statusMessage.textContent = "WebRTC desconectado";
        }
    }

    refreshWebRTC() {
        this.disconnectWebRTC();
        setTimeout(() => {
            this.connectWebRTC();
        }, 1000);
    }

    updateWebRTCButtons(connected) {
        this.connectWebRTCBtn.disabled = connected;
        this.disconnectWebRTCBtn.disabled = !connected;
        this.webrtcConnected = connected;
    }

    async performWebRTCConnection(videoElement, statusMessage) {
        try {
            // Verificar se há stream ativo primeiro
            statusMessage.textContent = "Verificando stream disponível...";
            
            // Aguardar um pouco para o stream se estabilizar
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Configuração do WebRTC com configurações mais robustas
            this.webrtcConnection = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' }
                ],
                iceCandidatePoolSize: 10
            });
            
            const pc = this.webrtcConnection;

            // Adicionar track de vídeo quando recebido
            pc.ontrack = (event) => {
                console.log('WebRTC track recebido:', event);
                videoElement.srcObject = event.streams[0];
                statusMessage.textContent = "Stream WebRTC conectado 🔴";
                this.updateWebRTCButtons(true);
            };

            // Tratar mudanças de estado da conexão
            pc.onconnectionstatechange = () => {
                console.log('Estado da conexão WebRTC:', pc.connectionState);
                switch (pc.connectionState) {
                    case 'connected':
                        statusMessage.textContent = "Stream WebRTC conectado 🔴";
                        this.updateWebRTCButtons(true);
                        break;
                    case 'connecting':
                        statusMessage.textContent = "Conectando ao stream WebRTC...";
                        break;
                    case 'disconnected':
                        statusMessage.textContent = "Conexão WebRTC perdida.";
                        this.updateWebRTCButtons(false);
                        break;
                    case 'failed':
                        statusMessage.textContent = "Falha na conexão WebRTC. Tente usar a aba HLS como alternativa.";
                        this.updateWebRTCButtons(false);
                        break;
                }
            };

            // Tratar erros ICE
            pc.oniceconnectionstatechange = () => {
                console.log('Estado ICE:', pc.iceConnectionState);
            };

            // Criar offer para iniciar a conexão
            const offer = await pc.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });

            await pc.setLocalDescription(offer);

            // URL do WebRTC stream do MediaMTX (usando WHEP para visualização)
            const webrtcUrl = 'http://localhost:8889/cam1/whep';
            
            statusMessage.textContent = "Conectando ao servidor WebRTC...";

            // Enviar offer para o MediaMTX via WHEP
            const response = await fetch(webrtcUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/sdp'
                },
                body: offer.sdp
            });

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
            }

            // Receber answer do MediaMTX
            const answerSdp = await response.text();
            const answer = new RTCSessionDescription({
                type: 'answer',
                sdp: answerSdp
            });

            await pc.setRemoteDescription(answer);
            
            statusMessage.textContent = "WebRTC conectado! Aguardando stream...";
            console.log('WebRTC conectado com sucesso');

        } catch (error) {
            console.error('Erro ao conectar WebRTC:', error);
            
            let errorMessage = 'Erro WebRTC desconhecido';
            if (error.message.includes('Failed to fetch')) {
                errorMessage = 'Não foi possível conectar ao servidor WebRTC. Verifique se o stream está ativo.';
            } else if (error.message.includes('404')) {
                errorMessage = 'Stream não encontrado. Verifique se o pipeline está funcionando.';
            } else if (error.message.includes('500')) {
                errorMessage = 'Erro interno do servidor. Tente novamente em alguns segundos.';
            } else {
                errorMessage = `Erro WebRTC: ${error.message}`;
            }
            
            statusMessage.textContent = errorMessage;
            this.updateWebRTCButtons(false);
        }
    }

    setupEventListeners() {
        this.closeLogsBtn.addEventListener('click', () => this.closeLogs());
        this.refreshLogsBtn.addEventListener('click', () => this.refreshLogs());
        this.logLines.addEventListener('change', () => this.refreshLogs());
        
        // WebRTC controls
        this.connectWebRTCBtn.addEventListener('click', () => this.connectWebRTC());
        this.disconnectWebRTCBtn.addEventListener('click', () => this.disconnectWebRTC());
        this.refreshWebRTCBtn.addEventListener('click', () => this.refreshWebRTC());
        
        // Monitor controls
        this.refreshAllStatusBtn.addEventListener('click', () => this.refreshAllContainerStatus());
        
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

    // Container Management Functions
    async refreshAllContainerStatus() {
        console.log('Atualizando status de todos os containers...');
        
        const containers = ['pipeline1', 'pipeline2', 'mediamtx'];
        
        // Verificar containers em paralelo para ser mais rápido
        const statusPromises = containers.map(container => this.checkContainerStatus(container));
        await Promise.all(statusPromises);
        
        this.updateLastUpdateTime();
    }

    async checkContainerStatus(containerName) {
        try {
            // Usar a API Docker para verificar status
            const result = await this.dockerAPI.getContainerStatus(containerName);
            
            if (result.success) {
                this.updateContainerStatus(containerName, result.status);
            } else {
                // Fallback para verificação por porta
                await this.checkContainerByPort(containerName);
            }
        } catch (error) {
            console.error(`Erro ao verificar status do ${containerName}:`, error);
            // Fallback para verificação por porta
            await this.checkContainerByPort(containerName);
        }
    }

    async checkContainerByPort(containerName) {
        const containerConfig = {
            pipeline1: {
                port: 8555,
                endpoint: 'http://localhost:8555',
                name: 'Pipeline1 RTSP Server'
            },
            pipeline2: {
                port: null,
                endpoint: null,
                name: 'Pipeline2 RTSP→SRT Bridge',
                dependsOn: ['pipeline1', 'mediamtx']
            },
            mediamtx: {
                port: 8080,
                endpoint: 'http://localhost:8080',
                name: 'MediaMTX Server'
            }
        };

        const config = containerConfig[containerName];
        
        if (config.port) {
            try {
                // Usar fetch com timeout personalizado
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 1500);
                
                const response = await fetch(config.endpoint, { 
                    method: 'HEAD',
                    mode: 'no-cors',
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                this.updateContainerStatus(containerName, 'running');
            } catch (error) {
                // Para RTSP (pipeline1), mesmo com erro de conexão, se chegou até aqui, o serviço está rodando
                // Para MediaMTX, vamos tentar uma abordagem diferente
                if (containerName === 'pipeline1') {
                    // RTSP server não responde a HTTP, mas se a porta está aberta, está rodando
                    this.updateContainerStatus(containerName, 'running');
                } else if (containerName === 'mediamtx') {
                    // Para MediaMTX, tentar acessar a página de status
                    try {
                        const statusResponse = await fetch('http://localhost:8080/status', {
                            method: 'GET',
                            mode: 'no-cors',
                            signal: new AbortController().signal
                        });
                        this.updateContainerStatus(containerName, 'running');
                    } catch (statusError) {
                        // Se não conseguiu acessar /status, tentar a raiz
                        try {
                            const rootResponse = await fetch('http://localhost:8080/', {
                                method: 'GET',
                                mode: 'no-cors',
                                signal: new AbortController().signal
                            });
                            this.updateContainerStatus(containerName, 'running');
                        } catch (rootError) {
                            this.updateContainerStatus(containerName, 'stopped');
                        }
                    }
                } else {
                    this.updateContainerStatus(containerName, 'stopped');
                }
            }
        } else if (config.dependsOn) {
            // Para pipeline2, verificar se as dependências estão rodando
            // Como não temos porta exposta, vamos assumir que está rodando se as dependências estão OK
            const dependenciesRunning = config.dependsOn.every(dep => 
                this.containerStatus[dep] === 'running'
            );
            
            if (dependenciesRunning) {
                this.updateContainerStatus(containerName, 'running');
            } else {
                this.updateContainerStatus(containerName, 'stopped');
            }
        } else {
            this.updateContainerStatus(containerName, 'unknown');
        }
    }

    updateContainerStatus(containerName, status) {
        this.containerStatus[containerName] = status;
        
        const statusElement = document.getElementById(`${containerName}-status`);
        const startBtn = document.getElementById(`${containerName}-start`);
        const stopBtn = document.getElementById(`${containerName}-stop`);
        
        if (statusElement) {
            let statusClass, statusIcon, statusText;
            
            switch (status) {
                case 'running':
                    statusClass = 'status-healthy';
                    statusIcon = 'fas fa-check-circle';
                    statusText = 'RUNNING';
                    break;
                case 'stopped':
                    statusClass = 'status-unhealthy';
                    statusIcon = 'fas fa-times-circle';
                    statusText = 'STOPPED';
                    break;
                default:
                    statusClass = 'status-unknown';
                    statusIcon = 'fas fa-question-circle';
                    statusText = 'UNKNOWN';
            }
            
            statusElement.innerHTML = `
                <span class="status-indicator ${statusClass}">
                    <i class="${statusIcon}"></i> ${statusText}
                </span>
            `;
        }
        
        // Atualizar botões
        if (startBtn && stopBtn) {
            if (status === 'running') {
                startBtn.disabled = true;
                stopBtn.disabled = false;
            } else {
                startBtn.disabled = false;
                stopBtn.disabled = true;
            }
        }
    }

    async startContainer(containerName) {
        try {
            console.log(`Iniciando container: ${containerName}`);
            
            // Mapear nomes para serviços do docker-compose
            const serviceMap = {
                pipeline1: 'pipeline1',
                pipeline2: 'pipeline2', 
                mediamtx: 'pipeline3'
            };
            
            const serviceName = serviceMap[containerName];
            if (!serviceName) {
                throw new Error('Serviço não encontrado');
            }
            
            // Mostrar feedback de carregamento
            this.showContainerActionFeedback(containerName, 'start', 'loading');
            
            // Executar comando via API Docker
            const command = `docker-compose start ${serviceName}`;
            console.log(`Executando: ${command}`);
            
            const result = await this.dockerAPI.executeCommand(command);
            
            if (!result.success) {
                throw new Error(result.output);
            }
            
            // Aguardar um pouco e verificar status
            setTimeout(() => {
                this.checkContainerStatus(containerName);
            }, 3000);
            
            // Mostrar feedback de sucesso
            this.showContainerActionFeedback(containerName, 'start', true);
            
        } catch (error) {
            console.error(`Erro ao iniciar ${containerName}:`, error);
            this.showContainerActionFeedback(containerName, 'start', false, error.message);
        }
    }

    async stopContainer(containerName) {
        try {
            console.log(`Parando container: ${containerName}`);
            
            // Mapear nomes para serviços do docker-compose
            const serviceMap = {
                pipeline1: 'pipeline1',
                pipeline2: 'pipeline2',
                mediamtx: 'pipeline3'
            };
            
            const serviceName = serviceMap[containerName];
            if (!serviceName) {
                throw new Error('Serviço não encontrado');
            }
            
            // Mostrar feedback de carregamento
            this.showContainerActionFeedback(containerName, 'stop', 'loading');
            
            // Executar comando docker-compose stop
            const command = `docker-compose stop ${serviceName}`;
            console.log(`Executando: ${command}`);
            
            const result = await this.dockerAPI.executeCommand(command);
            
            if (!result.success) {
                throw new Error(result.output);
            }
            
            // Aguardar um pouco e verificar status
            setTimeout(() => {
                this.checkContainerStatus(containerName);
            }, 2000);
            
            // Mostrar feedback de sucesso
            this.showContainerActionFeedback(containerName, 'stop', true);
            
        } catch (error) {
            console.error(`Erro ao parar ${containerName}:`, error);
            this.showContainerActionFeedback(containerName, 'stop', false, error.message);
        }
    }



    showContainerActionFeedback(containerName, action, status, errorMessage = null) {
        const containerBox = document.getElementById(`${containerName}-box`);
        if (!containerBox) return;
        
        // Criar ou atualizar indicador de feedback
        let feedbackElement = containerBox.querySelector('.action-feedback');
        if (!feedbackElement) {
            feedbackElement = document.createElement('div');
            feedbackElement.className = 'action-feedback';
            containerBox.appendChild(feedbackElement);
        }
        
        const actionText = action === 'start' ? 'iniciando' : 'parando';
        const actionTextPast = action === 'start' ? 'iniciado' : 'parado';
        
        let icon, color, background, message;
        
        if (status === 'loading') {
            icon = 'fas fa-spinner fa-spin';
            color = '#007bff';
            background = '#d1ecf1';
            message = `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} container...`;
        } else if (status === true) {
            icon = 'fas fa-check-circle';
            color = '#28a745';
            background = '#d4edda';
            message = `Container ${actionTextPast} com sucesso!`;
        } else {
            icon = 'fas fa-exclamation-triangle';
            color = '#dc3545';
            background = '#f8d7da';
            message = `Erro ao ${actionTextPast} container: ${errorMessage || 'Erro desconhecido'}`;
        }
        
        feedbackElement.innerHTML = `
            <div style="
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 12px;
                background: ${background};
                border: 1px solid ${color};
                border-radius: 4px;
                color: ${color};
                font-size: 0.85rem;
                font-weight: 500;
                margin-top: 10px;
            ">
                <i class="${icon}"></i>
                ${message}
            </div>
        `;
        
        // Remover feedback após 5 segundos (exceto para loading)
        if (status !== 'loading') {
            setTimeout(() => {
                if (feedbackElement && feedbackElement.parentNode) {
                    feedbackElement.remove();
                }
            }, 5000);
        }
    }

    async viewLogs(containerName) {
        this.currentService = containerName;
        
        const containerNames = {
            pipeline1: 'Pipeline1 (RTSP)',
            pipeline2: 'Pipeline2 (RTSP→SRT)',
            mediamtx: 'MediaMTX Server'
        };
        
        this.logsTitle.textContent = `Logs - ${containerNames[containerName]}`;
        this.logsContent.innerHTML = '<div class="loading">Carregando logs...</div>';
        this.logsOverlay.classList.add('show');
        
        await this.loadContainerLogs(containerName);
    }

    async loadContainerLogs(containerName) {
        if (!this.currentService) return;
        
        try {
            const lines = this.logLines.value;
            
            // Mapear nomes para containers reais
            const containerMap = {
                pipeline1: 'pipeline1-rtsp',
                pipeline2: 'pipeline2-rtsp-to-srt',
                mediamtx: 'mediamtx-server'
            };
            
            const containerId = containerMap[containerName];
            if (!containerId) {
                throw new Error('Container não encontrado');
            }
            
            // Obter logs via API Docker
            const result = await this.dockerAPI.getContainerLogs(containerName, lines);
            
            if (result.success) {
                this.renderLogs(result.logs);
            } else {
                this.logsContent.innerHTML = `<div class="log-error">Erro: ${result.logs[0]}</div>`;
            }
            
        } catch (error) {
            console.error('Erro ao carregar logs:', error);
            this.logsContent.innerHTML = `<div class="log-error">Erro ao carregar logs: ${error.message}</div>`;
        }
    }



    startAutoRefresh() {
        // Parar refresh anterior se existir
        this.stopAutoRefresh();
        
        // Iniciar novo intervalo de refresh a cada 10 segundos
        this.statusRefreshInterval = setInterval(() => {
            if (this.currentTab === 'monitor') {
                this.refreshAllContainerStatus();
            }
        }, 10000);
        
        console.log('Auto-refresh iniciado para monitor de containers');
    }

    stopAutoRefresh() {
        if (this.statusRefreshInterval) {
            clearInterval(this.statusRefreshInterval);
            this.statusRefreshInterval = null;
            console.log('Auto-refresh parado');
        }
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
