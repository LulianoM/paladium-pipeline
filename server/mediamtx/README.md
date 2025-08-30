# MediaMTX - Pipeline 3 🎬

**Servidor de streaming completo** que recebe SRT da Pipeline 2 e expõe múltiplos protocolos para visualização.

## 🎯 Funcionalidades

### ✅ **Entrada (Input)**
- **SRT Publish**: Recebe stream da Pipeline 2 na porta `8890`

### ✅ **Saídas (Output)**  
- **SRT Read**: Para VLC e outros players na porta `8890`
- **HLS**: Para browsers na porta `8888`
- **WebRTC**: Para browsers com baixa latência na porta `8889`
- **RTSP**: Protocolo interno na porta `8554`

### ✅ **Gerenciamento**
- **API REST**: Controle e monitoramento na porta `9997`
- **Métricas**: Estatísticas Prometheus na porta `9998`
- **Web Player**: Interface web simples para assistir

### ✅ **Resiliência**
- **Reconexão automática** quando Pipeline 1 para/reinicia
- **Pipeline 2 resiliente** com backoff exponencial
- **MediaMTX sempre disponível** para novos publishers

## 🚀 Como usar

### Iniciar todos os serviços
```bash
make up
```

### Assistir streams

#### 🎬 **Web Player (Recomendado)**
```bash
make open-player
# ou acesse: http://localhost:8888/web/
```

#### 📺 **VLC Player**
```bash
make test-vlc
# ou execute: vlc 'srt://localhost:8890?mode=caller&streamid=read:live'
```

#### 🌐 **HLS no Browser**
```bash
make test-hls
# ou acesse: http://localhost:8888/live/index.m3u8
```

### Testar funcionamento
```bash
# Teste completo (inclui resiliência)
make test-mediamtx

# Teste rápido (sem resiliência)
make test-mediamtx-quick
```

### Ver logs
```bash
# Logs do MediaMTX
make logs-media

# Logs da Pipeline 2
make logs-srt

# Todos os logs
make logs
```

## 📊 Endpoints disponíveis

| Serviço | URL | Descrição |
|---------|-----|-----------|
| **Web Player** | http://localhost:8888/web/ | Interface web para assistir |
| **SRT Stream** | srt://localhost:8890?mode=caller&streamid=read:live | Para VLC/ffplay |
| **HLS Stream** | http://localhost:8888/live/index.m3u8 | Para browsers |
| **API REST** | http://localhost:9997/v3/paths/list | Controle e status |
| **Métricas** | http://localhost:9998/metrics | Estatísticas |
| **Pipeline Monitor** | http://localhost:3000 | Monitor geral |

## 🏗️ Arquitetura

```
Pipeline 1 (MP4→RTSP) → Pipeline 2 (RTSP→SRT) → Pipeline 3 (MediaMTX)
                                                        ↓
                                            ┌─────────────────────┐
                                            │     MediaMTX        │
                                            │   (porta 8890)      │
                                            └─────────────────────┘
                                                        ↓
                                    ┌───────────┬─────────────┬──────────┐
                                    ↓           ↓             ↓          ↓
                               SRT Read     HLS Stream   WebRTC     Web Player
                              (VLC/ffplay)  (Browser)   (Browser)   (Browser)
```

## 🔧 Configuração

### Portas utilizadas
- `8554`: RTSP (interno)
- `8888`: HLS + Web Player
- `8889`: WebRTC  
- `8890`: SRT (publish + read)
- `8000-8001`: WebRTC UDP/TCP
- `9997`: API REST
- `9998`: Métricas

### Variáveis de ambiente
A Pipeline 2 usa automaticamente:
```bash
RTSP_URL=rtsp://rtsp-server:8554/cam1
SRT_URL=srt://media-server:8890?mode=caller&streamid=publish:live
```

## 🧪 Testes disponíveis

### Teste completo com resiliência
```bash
./test/test_mediamtx_complete.sh
```
Verifica:
- ✅ Serviços rodando
- ✅ Endpoints respondendo  
- ✅ Streams funcionando
- ✅ Resiliência (para/reinicia Pipeline 1)
- ✅ Logs sem erros críticos

### Teste rápido
```bash
./test/test_mediamtx_complete.sh --no-resilience
```
Mesmo teste, mas sem parar/reiniciar Pipeline 1.

## 🛠️ Troubleshooting

### Verificar se tudo está funcionando
```bash
make status
```

### Stream não aparece
1. Verificar se Pipeline 1 está rodando:
   ```bash
   docker-compose logs rtsp-server
   ```

2. Verificar se Pipeline 2 está conectando:
   ```bash
   docker-compose logs rtsp-to-srt
   ```

3. Verificar se MediaMTX recebeu o stream:
   ```bash
   curl http://localhost:9997/v3/paths/list
   ```

### Pipeline 2 não conecta no MediaMTX
- **Normal durante startup**: Pipeline 2 tem retry automático
- **Verificar logs**: `make logs-srt` deve mostrar tentativas de reconexão
- **Verificar MediaMTX**: `make logs-media` deve mostrar SRT publish

### Web Player não carrega
1. Verificar se HLS está funcionando:
   ```bash
   curl -I http://localhost:8888/live/index.m3u8
   ```

2. Verificar se há stream ativo:
   ```bash
   curl http://localhost:9997/v3/paths/get/live
   ```

### VLC não conecta
- **URL correta**: `srt://localhost:8890?mode=caller&streamid=read:live`
- **Verificar se stream existe**: usar API do MediaMTX
- **Firewall**: verificar se porta 8890 UDP está aberta

## 📈 Monitoramento

### Via API REST
```bash
# Status geral
curl http://localhost:9997/v3/config/global/get

# Lista de streams
curl http://localhost:9997/v3/paths/list

# Detalhes do stream 'live'
curl http://localhost:9997/v3/paths/get/live
```

### Via Métricas Prometheus
```bash
# Todas as métricas
curl http://localhost:9998/metrics

# Filtrar métricas específicas
curl http://localhost:9998/metrics | grep mediamtx
```

### Via Pipeline Monitor
Interface web completa em http://localhost:3000

## 🎯 Resiliência testada

O sistema foi testado para **recuperar automaticamente** quando:

1. **Pipeline 1 para**: Pipeline 2 tenta reconectar a cada 5s com backoff
2. **Pipeline 1 reinicia**: Pipeline 2 detecta e reconecta automaticamente  
3. **MediaMTX reinicia**: Pipeline 2 reconecta automaticamente
4. **Múltiplas falhas**: Sistema continua tentando indefinidamente

### Como testar resiliência
```bash
# Parar Pipeline 1
docker-compose stop rtsp-server

# Aguardar 10s e verificar logs da Pipeline 2
make logs-srt

# Reiniciar Pipeline 1  
docker-compose start rtsp-server

# Verificar se reconectou (aguardar ~15s)
make logs-srt
```

## 🌟 Vantagens do MediaMTX

1. **Múltiplos protocolos**: SRT, HLS, WebRTC, RTSP
2. **Baixa latência**: WebRTC < 1s, SRT < 2s  
3. **Alta compatibilidade**: HLS funciona em qualquer browser
4. **Gerenciamento avançado**: API REST completa
5. **Métricas detalhadas**: Integração com Prometheus
6. **Resiliência**: Reconexão automática
7. **Escalabilidade**: Suporta múltiplos clientes simultâneos
