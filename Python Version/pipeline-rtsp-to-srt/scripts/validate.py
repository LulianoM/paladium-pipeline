#!/usr/bin/env python3
"""
Script de validação para o pipeline RTSP to SRT
Verifica pré-requisitos e dependências antes de iniciar o pipeline
"""

import os
import sys
import subprocess
import socket
from pathlib import Path
from typing import List, Tuple, Optional

class Colors:
    """Cores para output colorido"""
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    END = '\033[0m'

def print_header(text: str):
    """Imprime cabeçalho colorido"""
    print(f"\n{Colors.BLUE}{Colors.BOLD}=== {text} ==={Colors.END}")

def print_success(text: str):
    """Imprime mensagem de sucesso"""
    print(f"{Colors.GREEN}✅ {text}{Colors.END}")

def print_error(text: str):
    """Imprime mensagem de erro"""
    print(f"{Colors.RED}❌ {text}{Colors.END}")

def print_warning(text: str):
    """Imprime mensagem de aviso"""
    print(f"{Colors.YELLOW}⚠️  {text}{Colors.END}")

def print_info(text: str):
    """Imprime mensagem informativa"""
    print(f"{Colors.BLUE}ℹ️  {text}{Colors.END}")

def run_command(cmd: List[str], capture_output: bool = True) -> Tuple[bool, str]:
    """Executa comando e retorna sucesso e output"""
    try:
        if capture_output:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            return result.returncode == 0, result.stdout.strip()
        else:
            result = subprocess.run(cmd, timeout=30)
            return result.returncode == 0, ""
    except (subprocess.TimeoutExpired, subprocess.CalledProcessError, FileNotFoundError):
        return False, ""

def check_docker():
    """Verifica se Docker está instalado e rodando"""
    print_header("Verificando Docker")
    
    # Verificar se docker está instalado
    success, output = run_command(["docker", "--version"])
    if not success:
        print_error("Docker não está instalado")
        return False
    
    print_success(f"Docker instalado: {output}")
    
    # Verificar se docker está rodando
    success, _ = run_command(["docker", "info"])
    if not success:
        print_error("Docker não está rodando. Inicie o Docker daemon")
        return False
    
    print_success("Docker daemon está rodando")
    return True

def check_docker_compose():
    """Verifica se Docker Compose está instalado"""
    print_header("Verificando Docker Compose")
    
    # Tentar docker compose (novo)
    success, output = run_command(["docker", "compose", "version"])
    if success:
        print_success(f"Docker Compose (novo) instalado: {output}")
        return True
    
    # Tentar docker-compose (legado)
    success, output = run_command(["docker-compose", "--version"])
    if success:
        print_success(f"Docker Compose (legado) instalado: {output}")
        return True
    
    print_error("Docker Compose não está instalado")
    return False

def check_project_structure():
    """Verifica estrutura do projeto"""
    print_header("Verificando Estrutura do Projeto")
    
    required_files = [
        "src/rtsp_to_srt.py",
        "Dockerfile",
        "docker-compose.yml",
        "Makefile"
    ]
    
    all_good = True
    for file_path in required_files:
        if os.path.exists(file_path):
            print_success(f"Arquivo encontrado: {file_path}")
        else:
            print_error(f"Arquivo não encontrado: {file_path}")
            all_good = False
    
    return all_good

def check_video_file():
    """Verifica arquivo de vídeo para testes"""
    print_header("Verificando Arquivo de Vídeo")
    
    video_path = "../video.mp4"
    if os.path.exists(video_path):
        size = os.path.getsize(video_path)
        size_mb = size / (1024 * 1024)
        print_success(f"Arquivo de vídeo encontrado: {video_path} ({size_mb:.1f} MB)")
        return True
    else:
        print_warning(f"Arquivo de vídeo não encontrado: {video_path}")
        print_info("O arquivo de vídeo é necessário apenas para testes com servidor RTSP local")
        print_info("Para usar um servidor RTSP externo, configure a variável RTSP_URL")
        return False

def check_ports():
    """Verifica se portas necessárias estão disponíveis"""
    print_header("Verificando Portas")
    
    ports_to_check = [
        (8554, "RTSP Server"),
        (9999, "SRT Output")
    ]
    
    all_good = True
    for port, description in ports_to_check:
        if is_port_available(port):
            print_success(f"Porta {port} ({description}) está disponível")
        else:
            print_warning(f"Porta {port} ({description}) está em uso")
            print_info(f"Isso pode causar conflitos. Considere alterar a porta no docker-compose.yml")
    
    return all_good

def is_port_available(port: int) -> bool:
    """Verifica se uma porta está disponível"""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(('localhost', port))
            return True
    except OSError:
        return False

def check_environment_variables():
    """Verifica variáveis de ambiente"""
    print_header("Verificando Variáveis de Ambiente")
    
    env_vars = [
        ("RTSP_URL", "rtsp://localhost:8554/cam1", "URL do servidor RTSP"),
        ("SRT_HOST", "127.0.0.1", "Host SRT de destino"),
        ("SRT_PORT", "9999", "Porta SRT de destino"),
        ("SRT_STREAMID", "", "Stream ID SRT (opcional)")
    ]
    
    for var_name, default_value, description in env_vars:
        value = os.getenv(var_name, default_value)
        if value:
            print_success(f"{var_name}={value} ({description})")
        else:
            print_info(f"{var_name} não definida, usando padrão: {default_value}")

def check_network_connectivity():
    """Verifica conectividade de rede básica"""
    print_header("Verificando Conectividade de Rede")
    
    # Verificar se consegue resolver DNS
    try:
        socket.gethostbyname('google.com')
        print_success("Conectividade de rede OK")
        return True
    except socket.gaierror:
        print_warning("Problemas de conectividade de rede detectados")
        print_info("Isso pode afetar downloads durante o build do Docker")
        return False

def check_disk_space():
    """Verifica espaço em disco disponível"""
    print_header("Verificando Espaço em Disco")
    
    try:
        import shutil
        total, used, free = shutil.disk_usage(".")
        free_gb = free / (1024**3)
        
        if free_gb > 5:
            print_success(f"Espaço em disco suficiente: {free_gb:.1f} GB livres")
            return True
        else:
            print_warning(f"Pouco espaço em disco: {free_gb:.1f} GB livres")
            print_info("Recomendado pelo menos 5GB para build das imagens Docker")
            return False
    except:
        print_warning("Não foi possível verificar espaço em disco")
        return True

def provide_recommendations():
    """Fornece recomendações baseadas nas verificações"""
    print_header("Recomendações")
    
    print_info("Para iniciar o pipeline completo com servidor RTSP de teste:")
    print("  make demo")
    print()
    print_info("Para iniciar apenas o pipeline (com servidor RTSP externo):")
    print("  export RTSP_URL=rtsp://seu-servidor:porta/stream")
    print("  make up")
    print()
    print_info("Para monitorar logs:")
    print("  make logs")
    print()
    print_info("Para testar saída SRT:")
    print("  ffplay srt://127.0.0.1:9999")
    print("  vlc srt://127.0.0.1:9999")

def main():
    """Função principal"""
    print(f"{Colors.BOLD}RTSP to SRT Pipeline - Validação de Pré-requisitos{Colors.END}")
    
    checks = [
        ("Docker", check_docker),
        ("Docker Compose", check_docker_compose),
        ("Estrutura do Projeto", check_project_structure),
        ("Arquivo de Vídeo", check_video_file),
        ("Portas", check_ports),
        ("Variáveis de Ambiente", check_environment_variables),
        ("Conectividade de Rede", check_network_connectivity),
        ("Espaço em Disco", check_disk_space)
    ]
    
    results = []
    for check_name, check_func in checks:
        try:
            result = check_func()
            results.append((check_name, result))
        except Exception as e:
            print_error(f"Erro durante verificação {check_name}: {e}")
            results.append((check_name, False))
    
    # Resumo
    print_header("Resumo da Validação")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for check_name, result in results:
        if result:
            print_success(f"{check_name}: OK")
        else:
            print_error(f"{check_name}: FALHOU")
    
    print(f"\n{Colors.BOLD}Resultado: {passed}/{total} verificações passaram{Colors.END}")
    
    if passed == total:
        print_success("Todos os pré-requisitos foram atendidos!")
        print_success("O pipeline está pronto para ser iniciado")
    elif passed >= total - 2:  # Permitir 1-2 falhas menores
        print_warning("A maioria dos pré-requisitos foi atendida")
        print_info("O pipeline pode funcionar, mas podem haver problemas")
    else:
        print_error("Muitos pré-requisitos falharam")
        print_error("Corrija os problemas antes de iniciar o pipeline")
        
    provide_recommendations()
    
    return passed >= total - 2

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Validação interrompida pelo usuário{Colors.END}")
        sys.exit(1)
    except Exception as e:
        print_error(f"Erro inesperado durante validação: {e}")
        sys.exit(1)
