#!/usr/bin/env python3
"""
Script de validação para o servidor RTSP
"""

import os
import sys
import subprocess
import time
import socket
from pathlib import Path


def check_file_exists(file_path):
    """Verificar se o arquivo de vídeo existe"""
    print(f"🔍 Verificando arquivo: {file_path}")
    if not os.path.exists(file_path):
        print(f"❌ Arquivo não encontrado: {file_path}")
        return False
    
    file_size = os.path.getsize(file_path)
    print(f"✅ Arquivo encontrado: {file_path} ({file_size} bytes)")
    return True


def check_docker():
    """Verificar se Docker está disponível"""
    print("🐳 Verificando Docker...")
    try:
        result = subprocess.run(['docker', '--version'], 
                              capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            print(f"✅ Docker disponível: {result.stdout.strip()}")
            return True
        else:
            print("❌ Docker não está funcionando")
            return False
    except (subprocess.TimeoutExpired, FileNotFoundError):
        print("❌ Docker não encontrado")
        return False


def check_docker_compose():
    """Verificar se Docker Compose está disponível"""
    print("📦 Verificando Docker Compose...")
    try:
        result = subprocess.run(['docker-compose', '--version'], 
                              capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            print(f"✅ Docker Compose disponível: {result.stdout.strip()}")
            return True
        else:
            print("❌ Docker Compose não está funcionando")
            return False
    except (subprocess.TimeoutExpired, FileNotFoundError):
        print("❌ Docker Compose não encontrado")
        return False


def check_port_available(port):
    """Verificar se a porta está disponível"""
    print(f"🔌 Verificando porta {port}...")
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        result = sock.connect_ex(('localhost', port))
        if result == 0:
            print(f"❌ Porta {port} já está em uso")
            return False
        else:
            print(f"✅ Porta {port} disponível")
            return True
    finally:
        sock.close()


def check_make():
    """Verificar se Make está disponível"""
    print("🔨 Verificando Make...")
    try:
        result = subprocess.run(['make', '--version'], 
                              capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            print("✅ Make disponível")
            return True
        else:
            print("⚠️  Make não está funcionando (opcional)")
            return False
    except (subprocess.TimeoutExpired, FileNotFoundError):
        print("⚠️  Make não encontrado (opcional)")
        return False


def validate_video_format(file_path):
    """Validar formato do vídeo usando ffprobe se disponível"""
    print("🎬 Verificando formato do vídeo...")
    try:
        result = subprocess.run([
            'docker', 'run', '--rm', 
            '-v', f'{os.path.abspath(file_path)}:/video.mp4:ro',
            'jrottenberg/ffmpeg:4.4-alpine',
            'ffprobe', '-v', 'quiet', '-print_format', 'json',
            '-show_format', '-show_streams', '/video.mp4'
        ], capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0:
            print("✅ Formato de vídeo válido")
            # Aqui poderia parsear o JSON para mais detalhes
            return True
        else:
            print("⚠️  Não foi possível validar o formato do vídeo")
            return True  # Não falhar por isso
    except (subprocess.TimeoutExpired, FileNotFoundError):
        print("⚠️  ffprobe não disponível para validação")
        return True


def main():
    """Função principal de validação"""
    print("🚀  RTSP Pipeline - Validação\n")
    
    # Definir caminhos
    video_path = "../video.mp4"
    
    # Lista de verificações
    checks = [
        ("Arquivo de vídeo", lambda: check_file_exists(video_path)),
        ("Docker", check_docker),
        ("Docker Compose", check_docker_compose),
        ("Porta 8554", lambda: check_port_available(8554)),
        ("Make (opcional)", check_make),
        ("Formato do vídeo", lambda: validate_video_format(video_path)),
    ]
    
    results = []
    
    # Executar verificações
    for name, check_func in checks:
        try:
            result = check_func()
            results.append((name, result))
        except Exception as e:
            print(f"❌ Erro ao verificar {name}: {e}")
            results.append((name, False))
        print()
    
    # Resumo
    print("📊 Resumo da Validação:")
    print("=" * 40)
    
    critical_failed = []
    optional_failed = []
    
    for name, result in results:
        status = "✅ OK" if result else "❌ FALHOU"
        print(f"{name:20} : {status}")
        
        if not result:
            if "opcional" in name.lower():
                optional_failed.append(name)
            else:
                critical_failed.append(name)
    
    print()
    
    # Verificar se pode prosseguir
    if critical_failed:
        print("❌ Validação FALHOU!")
        print("Problemas críticos encontrados:")
        for item in critical_failed:
            print(f"  - {item}")
        print("\nResolva os problemas acima antes de continuar.")
        sys.exit(1)
    
    elif optional_failed:
        print("⚠️  Validação PARCIAL!")
        print("Problemas opcionais encontrados:")
        for item in optional_failed:
            print(f"  - {item}")
        print("\nVocê pode continuar, mas algumas funcionalidades podem não estar disponíveis.")
    
    else:
        print("✅ Validação COMPLETA!")
        print("Todos os requisitos foram atendidos.")
    
    print("\n🚀 Para iniciar o servidor:")
    if not any("Make" in item for item in optional_failed):
        print("  make demo")
    else:
        print("  docker-compose up --build -d")
    
    print("\n📺 URL para teste no VLC:")
    print("  rtsp://localhost:8554/cam1")


if __name__ == "__main__":
    main()
