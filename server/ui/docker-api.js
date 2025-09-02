// Simulação de API Docker para o frontend
// Este arquivo simula comandos Docker que seriam executados em um backend real

class DockerAPI {
    constructor() {
        this.baseUrl = 'http://localhost:3001'; // URL do servidor Docker API
    }

    async executeCommand(command) {
        try {
            console.log(`Executando comando: ${command}`);
            
            // Extrair nome do container e ação do comando
            const parts = command.split(' ');
            const action = parts[1]; // start ou stop
            const serviceName = parts[2]; // pipeline1, pipeline2, pipeline3
            
            // Mapear nome do serviço para nome do container
            const containerMap = {
                'pipeline1': 'pipeline1',
                'pipeline2': 'pipeline2',
                'pipeline3': 'mediamtx'
            };
            
            const containerName = containerMap[serviceName];
            if (!containerName) {
                throw new Error('Serviço não encontrado');
            }
            
            // Fazer requisição para o servidor Docker API real
            const response = await fetch(`${this.baseUrl}/api/container/${containerName}/${action}`, {
                method: 'POST'
            });
            
            if (response.ok) {
                const data = await response.json();
                return {
                    success: true,
                    output: data.message,
                    exitCode: 0
                };
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }
        } catch (error) {
            return {
                success: false,
                output: `Erro ao executar comando: ${error.message}`,
                exitCode: 1
            };
        }
    }

    async getContainerStatus(containerName) {
        try {
            // Fazer requisição para o servidor Docker API real
            const response = await fetch(`${this.baseUrl}/api/container/${containerName}/status`);
            
            if (response.ok) {
                const data = await response.json();
                return {
                    success: true,
                    status: data.status,
                    details: data.details
                };
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Erro ao verificar status:', error);
            return {
                success: false,
                status: 'unknown',
                details: error.message
            };
        }
    }

    async getContainerLogs(containerName, lines = 100) {
        try {
            const containerMap = {
                'pipeline1': 'pipeline1-rtsp',
                'pipeline2': 'pipeline2-rtsp-to-srt',
                'mediamtx': 'mediamtx-server'
            };
            
            const containerId = containerMap[containerName];
            if (!containerId) {
                throw new Error('Container não encontrado');
            }
            
            // Executar comando docker logs real
            const command = `docker logs --tail ${lines} ${containerId}`;
            console.log(`Obtendo logs reais: ${command}`);
            
            // Fazer requisição para o servidor Docker API real
            const response = await fetch(`${this.baseUrl}/api/container/${containerName}/logs?lines=${lines}`);
            
            if (response.ok) {
                const data = await response.json();
                return {
                    success: true,
                    logs: data.logs
                };
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Erro ao obter logs reais:', error);
            return {
                success: false,
                logs: [`Erro ao obter logs: ${error.message}`]
            };
        }
    }
}

// Exportar para uso global
window.DockerAPI = DockerAPI;
