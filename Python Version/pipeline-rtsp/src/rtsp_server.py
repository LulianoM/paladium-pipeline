#!/usr/bin/env python3
"""
Servidor RTSP para streaming de arquivos MP4 usando GStreamer
"""

import gi
import logging
import signal
import sys
import os
from pathlib import Path

# Configurar GStreamer
gi.require_version('Gst', '1.0')
gi.require_version('GstRtspServer', '1.0')
from gi.repository import Gst, GstRtspServer, GLib

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class RTSPServer:
    def __init__(self, video_path: str, port: int = 8554, mount_point: str = "/cam1"):
        self.video_path = video_path
        self.port = port
        self.mount_point = mount_point
        self.server = None
        self.loop = None
        
        # Verificar se o arquivo de vídeo existe
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Arquivo de vídeo não encontrado: {video_path}")
        
        # Inicializar GStreamer
        Gst.init(None)
        
    def create_factory(self):
        """Criar factory para o stream RTSP"""
        factory = GstRtspServer.RTSPMediaFactory()
        
        # Pipeline GStreamer para ler MP4 em loop infinito e converter para RTSP
        # Usa multifilesrc com loop=true para repetir infinitamente
        pipeline = (
            f"( "
            f"multifilesrc location={self.video_path} loop=true caps=video/quicktime ! "
            f"qtdemux name=demux ! "
            f"queue ! "
            f"h264parse ! "
            f"avdec_h264 ! "
            f"videoconvert ! "
            f"x264enc tune=zerolatency bitrate=2000 speed-preset=superfast ! "
            f"rtph264pay name=pay0 pt=96 config-interval=1 "
            f")"
        )
        
        logger.info(f"Pipeline GStreamer: {pipeline}")
        factory.set_launch(pipeline)
        
        # Configurar para loop infinito
        factory.set_shared(True)
        factory.set_eos_shutdown(False)  # Não desligar quando chegar EOS
        
        return factory
    
    def start_server(self):
        """Iniciar o servidor RTSP"""
        try:
            # Criar servidor RTSP
            self.server = GstRtspServer.RTSPServer()
            self.server.set_service(str(self.port))
            
            # Criar factory e anexar ao mount point
            factory = self.create_factory()
            mounts = self.server.get_mount_points()
            mounts.add_factory(self.mount_point, factory)
            
            # Anexar servidor ao contexto principal
            self.server.attach(None)
            
            logger.info(f"Servidor RTSP iniciado na porta {self.port}")
            logger.info(f"Stream disponível em: rtsp://localhost:{self.port}{self.mount_point}")
            logger.info(f"Para testar no VLC: rtsp://localhost:{self.port}{self.mount_point}")
            
            # Criar loop principal
            self.loop = GLib.MainLoop()
            
            # Configurar handlers de sinal para shutdown graceful
            signal.signal(signal.SIGINT, self._signal_handler)
            signal.signal(signal.SIGTERM, self._signal_handler)
            
            # Iniciar loop principal
            self.loop.run()
            
        except Exception as e:
            logger.error(f"Erro ao iniciar servidor: {e}")
            raise
    
    def _signal_handler(self, signum, frame):
        """Handler para sinais de shutdown"""
        logger.info(f"Recebido sinal {signum}, parando servidor...")
        self.stop_server()
    
    def stop_server(self):
        """Parar o servidor RTSP"""
        if self.loop:
            self.loop.quit()
        logger.info("Servidor RTSP parado")


def main():
    """Função principal"""
    # Configurações padrão
    video_path = os.getenv('VIDEO_PATH', '/app/video/video.mp4')
    port = int(os.getenv('RTSP_PORT', '8554'))
    mount_point = os.getenv('MOUNT_POINT', '/cam1')
    
    logger.info(f"Iniciando servidor RTSP...")
    logger.info(f"Arquivo de vídeo: {video_path}")
    logger.info(f"Porta: {port}")
    logger.info(f"Mount point: {mount_point}")
    
    try:
        server = RTSPServer(video_path, port, mount_point)
        server.start_server()
    except KeyboardInterrupt:
        logger.info("Interrompido pelo usuário")
    except Exception as e:
        logger.error(f"Erro fatal: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
