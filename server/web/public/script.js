class PipelineMonitor {
    constructor() {
        this.ws = null;
        this.reconnectInterval = null;
        this.currentService = null;
        this.servicesData = {};
        
        this.initializeUI();
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
        const wsUrl = `${protocol}//${window.location.host}`;
        
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
                            '<i class="fas fa-check" style="color: #28a745;"></i> OK' : 
                            '<i class="fas fa-times" style="color: #dc3545;"></i> Falha'
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
                <button class="btn btn-primary" onclick="monitor.showLogs('${serviceId}')">
                    <i class="fas fa-file-alt"></i>
                    Ver Logs
                </button>
                <button class="btn btn-secondary" onclick="monitor.testEndpoint('${serviceId}')">
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
        this.lastUpdate.textContent = new Date().toLocaleTimeString('pt-BR');
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
            const response = await fetch(`/api/logs/${this.currentService}?lines=${lines}`);
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

// Inicializar o monitor quando a página carregar
let monitor;
document.addEventListener('DOMContentLoaded', () => {
    monitor = new PipelineMonitor();
});

// Fallback para APIs não disponíveis
if (!window.WebSocket) {
    console.warn('WebSocket não suportado, usando polling HTTP');
    
    // Implementar fallback com polling se necessário
    setInterval(async () => {
        try {
            const response = await fetch('/api/status');
            const data = await response.json();
            if (monitor) {
                monitor.updateServicesStatus(data);
            }
        } catch (error) {
            console.error('Erro no polling:', error);
        }
    }, 10000); // Poll a cada 10 segundos
}
