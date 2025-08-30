# 🧪 Paladium Pipeline - Suite de Testes

Esta pasta contém todos os testes automatizados para validar o funcionamento das pipelines do sistema.

## 📋 Testes Disponíveis

### 🎯 **Testes Principais**

| Script | Descrição | Pipeline Testada |
|--------|-----------|------------------|
| `test_pipeline1.sh` | Testa MP4 → RTSP | Pipeline 1 |
| `test_pipeline2_standalone.sh` | Testa RTSP → SRT (standalone) | Pipeline 2 |
| `test_both_pipelines.sh` | Testa integração completa | Pipeline 1 + 2 |
| `test_simple.sh` | Verificação rápida de status | Todas |
| `run_all_tests.sh` | **Executa todos os testes** | Todas |

## 🚀 Como Executar

### Via Makefile (Recomendado)
```bash
# Executar todos os testes
make test

# Testes individuais
make test-pipeline1    # Testa apenas Pipeline 1
make test-pipeline2    # Testa apenas Pipeline 2  
make test-both         # Testa integração Pipeline 1+2
make test-simple       # Teste rápido de status
make test-vlc          # Mostra como testar no VLC
```

### Via Scripts Diretos
```bash
# Executar todos os testes
./test/run_all_tests.sh

# Testes individuais
./test/test_pipeline1.sh
./test/test_pipeline2_standalone.sh
./test/test_both_pipelines.sh
./test/test_simple.sh
```

## 📊 O que cada teste verifica

### 🎥 **Pipeline 1 (MP4 → RTSP)**
- ✅ Container RTSP server rodando
- ✅ Stream RTSP acessível
- ✅ Informações do stream (codec, resolução)
- ✅ Continuidade do stream (loop)
- ✅ Logs sem erros

### 🔄 **Pipeline 2 (RTSP → SRT)**
- ✅ Container rtsp-to-srt rodando
- ✅ Fonte RTSP disponível
- ✅ Pipeline em estado "Playing"
- ✅ SRT configurado corretamente
- ✅ Conectividade SRT
- ✅ Comportamento de restart

### 🔗 **Integração (Pipeline 1 + 2)**
- ✅ Ambos containers saudáveis
- ✅ Comunicação entre pipelines
- ✅ Fluxo de dados funcionando
- ✅ Configuração de rede

### ⚡ **Teste Simples**
- ✅ Status básico de todos componentes
- ✅ Verificação rápida de conectividade

## 🛠️ Pré-requisitos

Os testes requerem as seguintes ferramentas instaladas:

- `docker-compose`
- `ffprobe` (parte do FFmpeg)
- `ffplay` (parte do FFmpeg)
- `curl`

## 📈 Interpretando Resultados

### ✅ **Sucesso**
- Todos os testes passaram
- Sistema está funcionando corretamente
- Pipelines estão integradas

### ❌ **Falha**
- Um ou mais testes falharam
- Verificar logs detalhados
- Possíveis problemas de configuração

### ⚠️ **Warnings**
- Testes passaram com avisos
- Sistema funciona mas pode ter instabilidades
- Revisar logs para otimizações

## 🔧 Solução de Problemas

### Erro: "Container não está rodando"
```bash
make down && make up
```

### Erro: "RTSP não acessível"
```bash
# Verificar se o container está saudável
docker-compose ps rtsp-server
docker-compose logs rtsp-server
```

### Erro: "Pipeline não está em Playing"
```bash
# Verificar logs detalhados
docker-compose logs rtsp-to-srt
```

## 📝 Estrutura dos Testes

Cada teste segue este padrão:
1. **Pré-requisitos**: Verificar dependências
2. **Inicialização**: Subir serviços necessários
3. **Validação**: Executar testes específicos
4. **Limpeza**: Cleanup de configurações temporárias
5. **Relatório**: Resumo dos resultados

## 🎯 Comandos Úteis

```bash
# Ver status dos containers
make status

# Ver logs em tempo real
make logs

# Parar todos os serviços
make down

# Limpeza completa
make clean

# Testar no VLC
make test-vlc
```

## 📊 Arquitetura Testada

```
video.mp4 → [Pipeline 1] → RTSP → [Pipeline 2] → SRT
           (rtsp-server)          (rtsp-to-srt)
```

- **Entrada**: Arquivo MP4
- **Saída 1**: Stream RTSP (`rtsp://localhost:8554/cam1`)
- **Saída 2**: Stream SRT (`srt://localhost:9999`)
- **Formato**: H264, 640x360, 30fps, loop infinito
