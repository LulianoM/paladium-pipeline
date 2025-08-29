# RTSP to SRT Pipeline

Pipeline Python que consome um fluxo RTSP e publica via SRT usando GStreamer, com reconexão automática e logs estruturados.

## 🎯 Objetivo

Implementar um pipeline robusto que:
- Consome fluxos RTSP (H.264/H.265)
- Processa: `RTSP → depay → parse → MPEG-TS → SRT (caller)`
- Detecta automaticamente o codec (H.264/H.265) e adapta o pipeline
- Implementa reconexão automática com exponential backoff
- Fornece logs estruturados e métricas básicas
- Roda em Docker com configuração via docker-compose

## 🏗️ Arquitetura

### Pipeline GStreamer
```
rtspsrc → rtpjitterbuffer → rtph264depay/rtph265depay → h264parse/h265parse → mpegtsmux → srtclientsink
```

### Componentes
- **RTSP Source**: Consome fluxo de vídeo RTSP
- **RTP Jitter Buffer**: Gerencia latência e jitter da rede
- **Depayloader**: Remove cabeçalhos RTP (adapta para H.264/H.265)
- **Parser**: Analisa e valida o stream de vídeo
- **MPEG-TS Muxer**: Empacota em MPEG Transport Stream
- **SRT Client Sink**: Publica via SRT no modo caller

## 🚀 Início Rápido

### Pré-requisitos
- Docker e Docker Compose
- Arquivo `video.mp4` no diretório pai (para testes)
- Portas 8554 (RTSP) e 9999 (SRT) disponíveis

### Validação
```bash
make validate
```

### Demo Completa (RTSP Server + Pipeline)
```bash
make demo
```

### Apenas Pipeline (com servidor RTSP externo)
```bash
export RTSP_URL=rtsp://seu-servidor:porta/stream
make up
```

## 📋 Comandos Disponíveis

| Comando | Descrição |
|---------|-----------|
| `make help` | Mostrar todos os comandos disponíveis |
| `make validate` | Validar pré-requisitos |
| `make demo` | Iniciar demo completa (recomendado) |
| `make up-test` | Iniciar com servidor RTSP de teste |
| `make up` | Iniciar apenas pipeline |
| `make down` | Parar todos os serviços |
| `make logs` | Ver logs do pipeline |
| `make logs-all` | Ver logs de todos os serviços |
| `make status` | Status dos containers |
| `make health` | Verificar saúde dos serviços |
| `make clean` | Limpar containers e imagens |

## ⚙️ Configuração

### Variáveis de Ambiente

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `RTSP_URL` | `rtsp://localhost:8554/cam1` | URL do servidor RTSP |
| `SRT_HOST` | `127.0.0.1` | Host de destino SRT |
| `SRT_PORT` | `9999` | Porta de destino SRT |
| `SRT_STREAMID` | `live/stream1` | Stream ID SRT (opcional) |

### Exemplo de Configuração Personalizada
```bash
# docker-compose.override.yml
services:
  rtsp-to-srt:
    environment:
      - RTSP_URL=rtsp://192.168.1.100:554/stream1
      - SRT_HOST=streaming-server.com
      - SRT_PORT=1935
      - SRT_STREAMID=live/channel1
```

## 🧪 Testando a Saída SRT

### Com FFplay
```bash
ffplay srt://127.0.0.1:9999
```

### Com VLC
```bash
vlc srt://127.0.0.1:9999
```

### Com GStreamer
```bash
gst-launch-1.0 srtclientsrc uri=srt://127.0.0.1:9999 ! decodebin ! autovideosink
```

## 📊 Monitoramento e Logs

### Logs Estruturados
O pipeline gera logs estruturados com:
- Timestamp
- Nível de log
- Componente
- Mensagem detalhada

### Métricas Disponíveis
- Estado atual do pipeline
- Contador de reconexões RTSP
- Contador de reconexões SRT
- Tempo de uptime
- Último erro registrado

### Exemplo de Log
```
2024-01-15 10:30:45 - RTSPToSRTPipeline - INFO - Pipeline iniciado, aguardando...
2024-01-15 10:30:46 - RTSPToSRTPipeline - INFO - Pipeline rodando com sucesso
2024-01-15 10:31:15 - RTSPToSRTPipeline - INFO - Métricas - Estado: running, Uptime: 30.1s, Reconexões: 0
```

## 🔄 Reconexão Automática

### Estratégia de Reconexão
- **Exponential Backoff**: Delay inicial de 1s, máximo 60s, multiplicador 2x
- **Detecção de Falhas**: Monitora erros de pipeline e EOS
- **Reconexão Inteligente**: Recria pipeline completo a cada tentativa
- **Logs Detalhados**: Registra cada tentativa e motivo da reconexão

### Estados do Pipeline
- `stopped`: Pipeline parado
- `starting`: Iniciando pipeline
- `running`: Pipeline funcionando normalmente
- `reconnecting`: Em processo de reconexão
- `error`: Erro crítico detectado

## 🐳 Docker

### Estrutura da Imagem
- **Base**: Ubuntu 22.04
- **GStreamer**: 1.20.7 com plugins completos
- **SRT**: libsrt 1.5.3 compilada do código fonte
- **Python**: 3.10 com PyGObject

### Build Manual
```bash
docker build -t rtsp-to-srt .
```

### Executar Manual
```bash
docker run --rm --network host \
  -e RTSP_URL=rtsp://localhost:8554/cam1 \
  -e SRT_HOST=127.0.0.1 \
  -e SRT_PORT=9999 \
  rtsp-to-srt
```

## 🛠️ Desenvolvimento

### Estrutura do Projeto
```
pipeline-rtsp-to-srt/
├── src/
│   └── rtsp_to_srt.py      # Script principal
├── scripts/
│   └── validate.py         # Validação de pré-requisitos
├── Dockerfile              # Imagem Docker
├── docker-compose.yml      # Orquestração
├── Makefile               # Comandos de automação
├── requirements.txt       # Dependências Python
└── README.md              # Documentação
```

### Debug no Container
```bash
make dev-shell
```

### Build sem Cache
```bash
make dev-build
```

### Logs em Tempo Real
```bash
make dev-up
```

## 🧪 Testes

### Teste de Pipeline Completo
```bash
make test-pipeline
```

### Teste de Saída SRT
```bash
make test-srt
```

### Validação de Pré-requisitos
```bash
make validate
```

## 🔧 Solução de Problemas

### Pipeline não Inicia
1. Verificar se servidor RTSP está acessível:
   ```bash
   gst-launch-1.0 rtspsrc location=rtsp://localhost:8554/cam1 ! fakesink
   ```

2. Verificar logs:
   ```bash
   make logs
   ```

3. Validar configuração:
   ```bash
   make validate
   ```

### Reconexões Frequentes
1. Verificar estabilidade da rede
2. Ajustar timeout do jitter buffer
3. Verificar capacidade do servidor SRT de destino

### Problemas de Codec
- O pipeline detecta automaticamente H.264/H.265
- Para forçar um codec específico, modifique o pipeline no código

### Latência Alta
1. Reduzir latency do rtspsrc:
   ```python
   pipeline = f"rtspsrc location={self.rtsp_url} latency=50 ! ..."
   ```

2. Ajustar buffer do jitter:
   ```python
   pipeline = f"... ! rtpjitterbuffer latency=100 ! ..."
   ```

## 📈 Performance

### Otimizações Implementadas
- Jitter buffer para estabilidade de rede
- Reconexão com backoff exponencial
- Logs estruturados para diagnóstico
- Pipeline otimizado para baixa latência

### Requisitos de Sistema
- **CPU**: 1 core (mínimo), 2 cores (recomendado)
- **RAM**: 512MB (mínimo), 1GB (recomendado)
- **Rede**: 10Mbps (para streams HD)

## 🤝 Integração com Outros Sistemas

### Como Fonte RTSP
Use o projeto `pipeline-rtsp` como fonte:
```bash
cd ../pipeline-rtsp
make demo
```

### Como Cliente SRT
Configure qualquer servidor SRT para receber em:
- **Host**: Configurável via `SRT_HOST`
- **Porta**: Configurável via `SRT_PORT`
- **Modo**: Caller (cliente conecta ao servidor)

### Streaming para CDNs
Muitas CDNs suportam ingestão via SRT:
- **Wowza**: Configure endpoint SRT
- **Nginx-RTMP**: Use módulo SRT
- **FFmpeg**: Use como intermediário

## 📄 Licença

Este projeto é open source e está disponível sob a licença MIT.

## 🆘 Suporte

Para problemas ou dúvidas:
1. Verifique os logs: `make logs`
2. Execute validação: `make validate`
3. Consulte a seção de solução de problemas
4. Abra uma issue no repositório

## 🔄 Atualizações

Para atualizar o pipeline:
```bash
git pull
make clean
make demo
```

---

**Nota**: Este pipeline foi desenvolvido e testado com GStreamer 1.20.7 e libsrt 1.5.3. Versões diferentes podem ter comportamentos distintos.
