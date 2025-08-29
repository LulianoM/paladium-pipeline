# RTSP Pipeline

Um servidor RTSP containerizado em Python que serve arquivos MP4 via streaming usando GStreamer e gstreamer-rtsp-server.

## 📋 Prerequisites

### Sistema Operacional
- Docker
- Docker Compose
- Make (opcional, mas recomendado)

### Arquivo de Vídeo
- Arquivo `video.mp4` no diretório pai (`../video.mp4`)
- Preferencialmente codificado em H.264
- O vídeo será reproduzido em loop infinito

## 🚀 One-Command Run

### Opção 1: Usando Make (Recomendado)
```bash
make demo
```

### Opção 2: Usando Docker Compose
```bash
docker-compose up --build -d
```

## 📺 Test URLs

### VLC Media Player
```
rtsp://localhost:8554/cam1
```

### Teste no VLC:
1. Abra o VLC
2. Vá em `Media` → `Open Network Stream`
3. Digite: `rtsp://localhost:8554/cam1`
4. Clique em `Play`

### Browser (Limitado)
```
rtsp://localhost:8554/cam1
```
⚠️ **Nota**: Navegadores modernos têm suporte limitado para RTSP. Use VLC ou players especializados.

## 🔍 Monitoring Endpoints

### Status dos Containers
```bash
make status
# ou
docker-compose ps
```

### Logs em Tempo Real
```bash
make logs
# ou
docker-compose logs -f rtsp-server
```

### Health Check
```bash
make health
```

### Informações do Vídeo
```bash
make video-info
```

## 🛠️ Comandos Disponíveis

| Comando | Descrição |
|---------|-----------|
| `make demo` | Build + Start (comando único para demo) |
| `make build` | Construir a imagem Docker |
| `make up` | Iniciar o servidor RTSP |
| `make down` | Parar o servidor RTSP |
| `make restart` | Reiniciar o servidor |
| `make logs` | Mostrar logs em tempo real |
| `make status` | Status dos containers |
| `make health` | Verificar saúde do servidor |
| `make clean` | Limpar containers e imagens |
| `make help` | Mostrar todos os comandos |

## 📁 Estrutura do Projeto

```
pipeline-rtsp/
├── src/
│   └── rtsp_server.py      # Servidor RTSP principal
├── Dockerfile              # Imagem Docker
├── docker-compose.yml      # Configuração Docker Compose
├── requirements.txt        # Dependências Python
├── Makefile               # Comandos de apoio
└── README.md              # Este arquivo
```

## ⚙️ Configurações

### Variáveis de Ambiente

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `VIDEO_PATH` | `/app/video/video.mp4` | Caminho do arquivo de vídeo |
| `RTSP_PORT` | `8554` | Porta do servidor RTSP |
| `MOUNT_POINT` | `/cam1` | Ponto de montagem do stream |

### Personalização

Para alterar as configurações, edite o arquivo `docker-compose.yml`:

```yaml
environment:
  - VIDEO_PATH=/app/video/video.mp4
  - RTSP_PORT=8554
  - MOUNT_POINT=/cam1
```

## 🐛 Troubleshooting

### Problema: "Arquivo video.mp4 não encontrado"
**Solução**: Certifique-se de que existe um arquivo `video.mp4` no diretório pai:
```bash
ls -la ../video.mp4
```

### Problema: "Container não inicia"
**Solução**: Verifique os logs:
```bash
make logs
```

### Problema: "VLC não consegue conectar"
**Soluções**:
1. Verifique se o container está rodando: `make status`
2. Verifique se a porta 8554 está livre: `netstat -an | grep 8554`
3. Teste a saúde do servidor: `make health`

### Problema: "Vídeo não reproduz corretamente"
**Soluções**:
1. Verifique o formato do vídeo: `make video-info`
2. Certifique-se de que o vídeo está em H.264
3. Teste o pipeline GStreamer: `make test-gstreamer`

## 🔧 Desenvolvimento

### Debug no Container
```bash
make dev-shell
```

### Build sem Cache
```bash
make dev-build
```

### Executar com Logs Visíveis
```bash
make dev-up
```

## 📊 Monitoramento

### Logs Estruturados
O servidor produz logs estruturados com informações sobre:
- Inicialização do servidor
- Pipeline GStreamer
- Conexões de clientes
- Erros e warnings

### Health Checks
O container inclui health checks automáticos que verificam:
- Status do GStreamer
- Disponibilidade do RTSP
- Saúde geral do serviço

## 🏗️ Arquitetura

### Componentes
1. **Python RTSP Server**: Servidor principal usando GStreamer
2. **GStreamer Pipeline**: Pipeline para decodificação e streaming
3. **Docker Container**: Ambiente containerizado
4. **Volume Mount**: Montagem do arquivo de vídeo

### Fluxo de Dados
```
video.mp4 → filesrc → qtdemux → h264parse → rtph264pay → RTSP Stream
```

## 📄 Licença

Este projeto é parte da Pipeline e está sujeito aos termos de licença da organização.

## 🤝 Contribuição

Para contribuir com o projeto:
1. Faça um fork do repositório
2. Crie uma branch para sua feature
3. Implemente suas mudanças
4. Teste usando `make demo`
5. Submeta um pull request

---

**Suporte**: Para dúvidas ou problemas, consulte os logs (`make logs`) e a seção de troubleshooting acima.
