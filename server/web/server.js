const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const Docker = require('dockerode');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;
const docker = new Docker();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configuração dos serviços monitorados
const services = {
  'rtsp-server': {
    name: 'Pipeline RTSP',
    description: 'Converte MP4 para RTSP',
    port: 8554,
    healthEndpoint: 'rtsp://localhost:8554/cam1',
    containerName: 'rtsp-server'
  },
  'rtsp-to-srt': {
    name: 'Pipeline RTSP-to-SRT',
    description: 'Converte RTSP para SRT',
    port: 9999,
    healthEndpoint: 'srt://localhost:9999',
    containerName: 'rtsp-to-srt'
  }
};

// WebSocket Server
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

// Função para verificar se um container está rodando
async function checkContainerStatus(containerName) {
  try {
    // Buscar containers rodando
    const runningContainers = await docker.listContainers();
    let container = runningContainers.find(c => 
      c.Names.some(name => name.includes(`-${containerName}-`) || name.endsWith(`-${containerName}-1`))
    );
    
    if (container) {
      // Para containers rodando, usar o tempo de início (StartedAt) via inspect
      try {
        const dockerContainer = docker.getContainer(container.Id);
        const inspectData = await dockerContainer.inspect();
        const startedAt = new Date(inspectData.State.StartedAt);
        
        return {
          status: 'healthy',
          state: 'running',
          uptime: startedAt,
          ports: container.Ports
        };
      } catch (inspectError) {
        // Fallback para Created se não conseguir inspecionar
        return {
          status: 'healthy',
          state: 'running',
          uptime: new Date(container.Created * 1000),
          ports: container.Ports
        };
      }
    }
    
    // Se não encontrou rodando, buscar todos (incluindo parados)
    const allContainers = await docker.listContainers({ all: true });
    container = allContainers.find(c => 
      c.Names.some(name => name.includes(`-${containerName}-`) || name.endsWith(`-${containerName}-1`))
    );
    
    if (container) {
      return {
        status: 'unhealthy',
        state: container.State,
        uptime: container.Created ? new Date(container.Created * 1000) : null,
        ports: container.Ports || []
      };
    }
    
    return {
      status: 'not_found',
      state: 'not found',
      uptime: null,
      ports: []
    };
  } catch (error) {
    console.error(`Erro ao verificar container ${containerName}:`, error.message);
    return {
      status: 'error',
      state: 'error',
      uptime: null,
      ports: [],
      error: error.message
    };
  }
}

// Função para verificar conectividade de porta
function checkPortConnectivity(port, host = 'localhost') {
  return new Promise((resolve) => {
    const net = require('net');
    const socket = new net.Socket();
    
    socket.setTimeout(3000);
    
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.on('error', () => {
      // Para RTSP e SRT, uma conexão que é rejeitada ainda indica que o serviço está rodando
      resolve(false);
    });
    
    socket.connect(port, host);
  });
}

// Função para obter logs do container
async function getContainerLogs(serviceName, lines = 100) {
  try {
    const containerName = services[serviceName]?.containerName;
    if (!containerName) {
      throw new Error('Serviço não encontrado');
    }

    // Buscar container pelo nome
    const containers = await docker.listContainers({ all: true });
    const container = containers.find(c => 
      c.Names.some(name => name.includes(`-${containerName}-`) || name.endsWith(`-${containerName}-1`))
    );

    if (!container) {
      throw new Error('Container não encontrado');
    }

    // Obter logs usando dockerode
    const dockerContainer = docker.getContainer(container.Id);
    const stream = await dockerContainer.logs({
      stdout: true,
      stderr: true,
      tail: lines,
      timestamps: false
    });

    // Converter buffer para string e limpar caracteres de controle do Docker
    const logs = stream.toString('utf8')
      .replace(/[\x00-\x08]/g, '') // Remove caracteres de controle Docker
      .replace(/\x1b\[[0-9;]*m/g, '') // Remove códigos de cor ANSI
      .split('\n')
      .filter(line => line.trim())
      .slice(-lines);

    return logs;
  } catch (error) {
    throw new Error(`Erro ao obter logs: ${error.message}`);
  }
}

// Função para obter status completo dos serviços
async function getServicesStatus() {
  const status = {};
  
  for (const [serviceId, service] of Object.entries(services)) {
    const containerStatus = await checkContainerStatus(service.containerName);
    
    // Para serviços de streaming, se o container está rodando, consideramos conectividade OK
    let connectivity = false;
    if (containerStatus.status === 'healthy') {
      // Para RTSP e SRT, se o container está rodando, assumimos que está funcionando
      connectivity = true;
    } else {
      // Se o container não está rodando, testa a porta mesmo assim
      connectivity = await checkPortConnectivity(service.port);
    }
    
    // Determinar status geral baseado no container
    let overall = 'unhealthy';
    if (containerStatus.status === 'healthy') {
      overall = 'healthy';
    } else if (containerStatus.status === 'not_found') {
      overall = 'not_found';
    } else if (containerStatus.status === 'error') {
      overall = 'error';
    }
    
    status[serviceId] = {
      ...service,
      container: containerStatus,
      connectivity: connectivity,
      lastCheck: new Date().toISOString(),
      overall: overall
    };
  }
  
  return status;
}

// Rotas da API
app.get('/api/status', async (req, res) => {
  try {
    const status = await getServicesStatus();
    res.json(status);
  } catch (error) {
    console.error('Erro ao obter status:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.get('/api/logs/:service', async (req, res) => {
  try {
    const { service } = req.params;
    const { lines = 100 } = req.query;
    
    if (!services[service]) {
      return res.status(404).json({ error: 'Serviço não encontrado' });
    }
    
    const logs = await getContainerLogs(service, parseInt(lines));
    res.json({ logs });
  } catch (error) {
    console.error(`Erro ao obter logs do serviço ${req.params.service}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// WebSocket para atualizações em tempo real
wss.on('connection', (ws) => {
  console.log('Cliente conectado via WebSocket');
  
  // Enviar status inicial
  getServicesStatus().then(status => {
    ws.send(JSON.stringify({ type: 'status', data: status }));
  });
  
  // Configurar atualizações periódicas
  const interval = setInterval(async () => {
    try {
      const status = await getServicesStatus();
      ws.send(JSON.stringify({ type: 'status', data: status }));
    } catch (error) {
      console.error('Erro ao enviar atualização via WebSocket:', error);
    }
  }, 5000); // Atualiza a cada 5 segundos
  
  ws.on('close', () => {
    console.log('Cliente desconectado do WebSocket');
    clearInterval(interval);
  });
  
  ws.on('error', (error) => {
    console.error('Erro no WebSocket:', error);
    clearInterval(interval);
  });
});

// Rota principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
server.listen(port, () => {
  console.log(`🚀 Paladium Pipeline Monitor rodando em http://localhost:${port}`);
  console.log(`📊 Monitorando serviços: ${Object.keys(services).join(', ')}`);
});
