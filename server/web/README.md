# Pipeline Monitor

Interface web minimalista para monitoramento das pipelines RTSP e RTSP-to-SRT do Paladium.

## Funcionalidades

- ✅ **Monitoramento em tempo real** dos serviços via WebSocket
- 🔍 **Verificação de status** de containers Docker
- 🌐 **Teste de conectividade** das portas dos serviços
- 📊 **Interface minimalista** e responsiva
- 📝 **Visualizador de logs** expandível
- 🔄 **Atualizações automáticas** a cada 5 segundos

## Como usar

### Via Docker Compose (Recomendado)

1. A partir do diretório raiz do projeto:
```bash
make up
```

2. Abrir o monitor:
```bash
make open-monitor
# ou acesse: http://localhost:3000
```

### Desenvolvimento local

1. Instalar dependências:
```bash
cd server/web
npm install
```

2. Iniciar em modo desenvolvimento:
```bash
npm run dev
```

3. Acessar: http://localhost:3000

## API Endpoints

- `GET /api/status` - Status de todos os serviços
- `GET /api/logs/:service?lines=100` - Logs de um serviço específico
- `WebSocket /` - Atualizações em tempo real

## Serviços Monitorados

### Pipeline RTSP
- **Função**: Converte MP4 para RTSP
- **Porta**: 8554
- **Endpoint**: rtsp://localhost:8554/cam1
- **Container**: paladium-pipeline-rtsp-server-1

### Pipeline RTSP-to-SRT  
- **Função**: Converte RTSP para SRT
- **Porta**: 9999
- **Endpoint**: srt://localhost:9999
- **Container**: paladium-pipeline-rtsp-to-srt-1

## Status dos Serviços

### 🟢 Online (Healthy)
- Container rodando
- Porta acessível
- Serviço respondendo

### 🔴 Offline (Unhealthy)
- Container parado ou com erro
- Porta inacessível
- Falha de conectividade

### ⚠️ Desconhecido
- Status indeterminado
- Erro ao verificar o serviço

## Visualizador de Logs

- Clique em **"Ver Logs"** em qualquer serviço
- Escolha quantidade de linhas (50, 100, 200, 500)
- Logs coloridos por tipo (erro, warning, info)
- Atualização manual via botão refresh
- Fechar com ESC ou clicando fora

## Comandos Make

```bash
# Iniciar todos os serviços
make up

# Abrir monitor
make open-monitor

# Ver logs do monitor
make logs-monitor

# Parar todos os serviços  
make down

# Ver status geral
make status
```

## Tecnologias

- **Backend**: Node.js, Express, WebSocket
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Docker**: Dockerode para integração
- **Monitoramento**: Health checks + conectividade de porta

## Estrutura

```
server/web/
├── server.js          # Servidor Express + WebSocket
├── package.json       # Dependências Node.js
├── Dockerfile         # Container da aplicação
├── public/            # Arquivos estáticos
│   ├── index.html     # Interface principal
│   ├── style.css      # Estilos minimalistas
│   └── script.js      # Lógica do frontend
└── README.md          # Esta documentação
```
