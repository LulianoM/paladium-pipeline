# Paladium Pipeline - Sistema de Streaming de Vídeo

Este projeto implementa um pipeline completo de streaming de vídeo usando Docker Compose, com três pipelines interconectados e uma interface web para visualização.

## 🏗️ Arquitetura do Sistema

### Pipeline 1 - RTSP Server
- **Tecnologia**: Rust + GStreamer
- **Função**: Servidor RTSP que serve arquivos de vídeo
- **Porta**: 8555
- **Stream**: `rtsp://localhost:8555/cam1`

**Componentes**:
- `gstreamer`: Framework de mídia
- `gstreamer-rtsp-server`: Servidor RTSP
- `multifilesrc`: Fonte de arquivo com loop
- `qtdemux`: Demuxer para arquivos MP4
- `h264parse`: Parser H.264
- `rtph264pay`: Payload RTP H.264

### Pipeline 2 - RTSP to SRT Bridge
- **Tecnologia**: FFmpeg
- **Função**: Ponte entre RTSP e SRT
- **Conecta**: Pipeline1 (RTSP) → Pipeline3 (SRT)

**Componentes**:
- `ffmpeg`: Conversor de mídia
- `rtspsrc`: Fonte RTSP
- `srtclientsink`: Cliente SRT
- Flags de timestamp para estabilidade

### Pipeline 3 - MediaMTX Server
- **Tecnologia**: MediaMTX (Go)
- **Função**: Servidor de mídia que converte SRT para HLS
- **Portas**: 
  - SRT: 8888
  - HLS: 8080
  - WebRTC: 8889
  - RTMP: 1935

**Componentes**:
- `mediamtx`: Servidor de mídia universal
- Conversão automática SRT → HLS
- Suporte a múltiplos protocolos

### UI - HLS Player
- **Tecnologia**: HTML5 + JavaScript + Nginx
- **Função**: Interface web para reprodução HLS
- **Porta**: 8181
- **URL**: `http://localhost:8181`

**Componentes**:
- `hls.js`: Player HLS JavaScript
- `nginx`: Servidor web
- Interface responsiva

## 📋 Pré-requisitos

- Docker
- Docker Compose
- Git

## 🚀 Como Executar o Projeto

### 1. Clone o repositório
```bash
git clone <repository-url>
cd paladium-pipeline
```

### 2. Execute todos os serviços
```bash
make demo
```

### 3. Verifique o status dos serviços
```bash
docker-compose ps
```

### 4. Acesse a interface web
Abra seu navegador e acesse: `http://localhost:8181`

## 🔧 Comandos Úteis

### Gerenciamento de Serviços
```bash
# Iniciar todos os serviços
docker-compose up -d

# Parar todos os serviços
docker-compose down

# Reiniciar um serviço específico
docker-compose restart pipeline1

# Ver logs de um serviço
docker-compose logs pipeline1
docker-compose logs pipeline2
docker-compose logs pipeline3
docker-compose logs ui
```

### Build e Rebuild
```bash
# Rebuild de um serviço específico
docker-compose build pipeline1
docker-compose build pipeline2
docker-compose build pipeline3
docker-compose build ui

# Rebuild sem cache
docker-compose build --no-cache pipeline1

# Rebuild e restart
docker-compose down pipeline1 && docker-compose build pipeline1 && docker-compose up pipeline1 -d
```

### Monitoramento
```bash
# Ver logs em tempo real
docker-compose logs -f pipeline2

# Ver status dos containers
docker ps

# Ver uso de recursos
docker stats
```

## 🌐 Endpoints e URLs

### Streams Disponíveis
- **RTSP**: `rtsp://localhost:8555/cam1`
- **HLS Master**: `http://localhost:8080/cam1/index.m3u8`
- **HLS Stream**: `http://localhost:8080/cam1/video1_stream.m3u8`
- **WebRTC**: `http://localhost:8889/cam1`
- **RTMP**: `rtmp://localhost:1935/cam1`

### Interface Web
- **Player HLS**: `http://localhost:8181`

## 📁 Estrutura do Projeto

```
paladium-pipeline/
├── docker-compose.yml          # Configuração dos serviços
├── Makefile                    # Comandos auxiliares
├── pipeline-rtsp/              # Pipeline 1 - RTSP Server
│   ├── Dockerfile
│   ├── Cargo.toml
│   ├── src/main.rs
│   └── sinners.mp4            # Arquivo de vídeo de exemplo
├── pipeline-rtsp-to-srt/       # Pipeline 2 - RTSP to SRT Bridge
│   ├── Dockerfile
│   ├── ffmpeg_bridge.sh       # Script FFmpeg
│   └── src/main.rs            # (não usado - substituído por FFmpeg)
├── server/
│   ├── mediamtx/              # Pipeline 3 - MediaMTX
│   │   ├── Dockerfile
│   │   └── mediamtx.yml       # Configuração MediaMTX
│   └── ui/                    # Interface Web
│       ├── Dockerfile
│       ├── index.html
│       ├── script.js
│       └── style.css
└── test/                      # Scripts de teste
    ├── run_all_tests.sh
    ├── test_both_pipelines.sh
    └── ...
```

## 🔍 Troubleshooting

### Problemas Comuns

1. **Vídeo corrompido na UI**
   ```bash
   # Verificar logs do pipeline2
   docker-compose logs pipeline2
   
   # Reiniciar pipeline2
   docker-compose restart pipeline2
   ```

2. **Stream não aparece**
   ```bash
   # Verificar se todos os serviços estão rodando
   docker-compose ps
   
   # Verificar logs do MediaMTX
   docker-compose logs pipeline3
   ```

3. **Problemas de conectividade**
   ```bash
   # Testar RTSP diretamente
   curl -I rtsp://localhost:8555/cam1
   
   # Testar HLS
   curl -I http://localhost:8080/cam1/index.m3u8
   ```

### Limpeza do Sistema
```bash
# Parar e remover todos os containers
docker-compose down

# Limpar cache do Docker
docker system prune -f

# Rebuild completo
docker-compose build --no-cache
docker-compose up -d
```

## 📊 Monitoramento e Logs

### Logs em Tempo Real
```bash
# Todos os serviços
docker-compose logs -f

# Serviço específico
docker-compose logs -f pipeline2
```

### Verificar Status dos Streams
```bash
# Verificar se o stream está sendo publicado
curl -s http://localhost:8080/cam1/index.m3u8

# Verificar playlist de vídeo
curl -s http://localhost:8080/cam1/video1_stream.m3u8 | head -10
```

## 🎯 Funcionalidades

- ✅ **Streaming RTSP**: Servidor RTSP com loop de vídeo
- ✅ **Conversão SRT**: Ponte RTSP → SRT usando FFmpeg
- ✅ **HLS Generation**: Conversão automática SRT → HLS
- ✅ **Interface Web**: Player HLS responsivo
- ✅ **Múltiplos Protocolos**: RTSP, SRT, HLS, WebRTC, RTMP
- ✅ **Auto-reconexão**: Recuperação automática de falhas
- ✅ **Docker Compose**: Orquestração completa dos serviços

## 📝 Notas Técnicas

- O Pipeline 2 foi implementado com FFmpeg em vez de GStreamer Rust para maior estabilidade
- O MediaMTX é configurado para gerar HLS com segmentos de 2 segundos
- O sistema suporta reconexão automática em caso de falhas
- Todos os serviços são containerizados para facilitar deploy e desenvolvimento
- O inicio do projeto foi utilizando o GStreamer for connecting pipelines porém ocorreu diversos problemas na implementação da mesma, sendo assim, decidiu utilizar o FFmpeg para conseguir atingir o objetivo
- Os testes de resiliência podem ser feitos e monitorados com a UI, temos a interface pronta para utilizar desses mecanismos
