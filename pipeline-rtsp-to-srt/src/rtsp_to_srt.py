#!/usr/bin/env python3
"""
Pipeline RTSP para SRT usando GStreamer
Consome um fluxo RTSP e publica via SRT com reconexão automática
"""

import gi
import logging
import signal
import sys
import os
import time
import threading
import subprocess
from typing import Optional
from dataclasses import dataclass
from enum import Enum

# Configurar GStreamer
gi.require_version('Gst', '1.0')
from gi.repository import Gst, GLib

# Configurar logging estruturado
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class PipelineState(Enum):
    """Estados possíveis do pipeline"""
    STOPPED = "stopped"
    STARTING = "starting"
    RUNNING = "running"
    RECONNECTING = "reconnecting"
    ERROR = "error"


@dataclass
class Metrics:
    """Métricas do pipeline"""
    rtsp_reconnections: int = 0
    srt_reconnections: int = 0
    total_reconnections: int = 0
    uptime_start: float = 0
    last_error: str = ""
    current_state: PipelineState = PipelineState.STOPPED

    def reset(self):
        """Reset das métricas"""
        self.rtsp_reconnections = 0
        self.srt_reconnections = 0
        self.total_reconnections = 0
        self.uptime_start = time.time()
        self.last_error = ""

    def get_uptime(self) -> float:
        """Retorna o uptime em segundos"""
        if self.uptime_start > 0:
            return time.time() - self.uptime_start
        return 0


class ExponentialBackoff:
    """Implementa exponential backoff para reconexões"""
    
    def __init__(self, initial_delay: float = 1.0, max_delay: float = 60.0, multiplier: float = 2.0):
        self.initial_delay = initial_delay
        self.max_delay = max_delay
        self.multiplier = multiplier
        self.current_delay = initial_delay
        self.attempt_count = 0
    
    def wait(self):
        """Espera o tempo atual de backoff"""
        logger.info(f"Aguardando {self.current_delay:.1f}s antes da próxima tentativa (tentativa #{self.attempt_count + 1})")
        time.sleep(self.current_delay)
        self.attempt_count += 1
        self.current_delay = min(self.current_delay * self.multiplier, self.max_delay)
    
    def reset(self):
        """Reset do backoff"""
        self.current_delay = self.initial_delay
        self.attempt_count = 0


def check_srt_support() -> bool:
    """Verifica se o suporte SRT está disponível no GStreamer"""
    try:
        Gst.init(None)
        # Tentar criar elemento srtsink
        element = Gst.ElementFactory.make("srtsink", None)
        if element:
            logger.info("Plugin SRT do GStreamer disponível")
            return True
        else:
            logger.warning("Plugin SRT do GStreamer não disponível")
            return False
    except Exception as e:
        logger.warning(f"Erro ao verificar suporte SRT: {e}")
        return False


class RTSPToSRTPipeline:
    """Pipeline para converter RTSP em SRT usando GStreamer ou FFmpeg"""
    
    def __init__(self, rtsp_url: str, srt_host: str, srt_port: int, srt_streamid: str = ""):
        self.rtsp_url = rtsp_url
        self.srt_host = srt_host
        self.srt_port = srt_port
        self.srt_streamid = srt_streamid
        
        self.pipeline: Optional[Gst.Pipeline] = None
        self.ffmpeg_process: Optional[subprocess.Popen] = None
        self.loop: Optional[GLib.MainLoop] = None
        self.metrics = Metrics()
        self.backoff = ExponentialBackoff()
        self.running = False
        self.reconnect_thread: Optional[threading.Thread] = None
        self.use_gstreamer = True
        
        # Inicializar GStreamer
        Gst.init(None)
        
        # Verificar suporte SRT
        self.use_gstreamer = check_srt_support()
        if not self.use_gstreamer:
            logger.info("Usando FFmpeg como fallback para SRT")
        
        logger.info("Pipeline inicializado")
    
    def detect_codec_from_caps(self, caps_str: str) -> str:
        """Detecta o codec a partir das capabilities"""
        if "h265" in caps_str.lower() or "hevc" in caps_str.lower():
            return "h265"
        elif "h264" in caps_str.lower() or "avc" in caps_str.lower():
            return "h264"
        else:
            # Default para H.264
            logger.warning(f"Codec não detectado em: {caps_str}, usando H.264 como padrão")
            return "h264"
    
    def create_pipeline(self) -> Optional[Gst.Pipeline]:
        """Cria o pipeline GStreamer RTSP -> SRT"""
        if not self.use_gstreamer:
            return None
            
        pipeline_str = self._build_pipeline_string()
        logger.info(f"Criando pipeline GStreamer: {pipeline_str}")
        
        pipeline = Gst.parse_launch(pipeline_str)
        if not pipeline:
            raise RuntimeError("Falha ao criar pipeline GStreamer")
        
        # Configurar bus para mensagens
        bus = pipeline.get_bus()
        bus.add_signal_watch()
        bus.connect("message", self._on_bus_message)
        
        return pipeline
    
    def create_ffmpeg_process(self) -> subprocess.Popen:
        """Cria processo FFmpeg como alternativa"""
        srt_uri = f"srt://{self.srt_host}:{self.srt_port}?mode=caller"
        if self.srt_streamid:
            srt_uri += f"&streamid={self.srt_streamid}"
        
        cmd = [
            'ffmpeg',
            '-i', self.rtsp_url,
            '-c', 'copy',  # Copy streams without re-encoding
            '-f', 'mpegts',
            srt_uri
        ]
        
        logger.info(f"Iniciando FFmpeg: {' '.join(cmd)}")
        
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            universal_newlines=True
        )
        
        return process
    
    def _build_pipeline_string(self) -> str:
        """Constrói a string do pipeline GStreamer"""
        # Pipeline base: RTSP -> depay -> parse -> mux -> SRT
        # O pipeline será adaptado dinamicamente baseado no codec detectado
        
        # Construir URI SRT para srtsink
        srt_uri = f"srt://{self.srt_host}:{self.srt_port}?mode=caller"
        if self.srt_streamid:
            srt_uri += f"&streamid={self.srt_streamid}"
        
        # Pipeline inicial com probe para detectar codec
        pipeline = (
            f"rtspsrc location={self.rtsp_url} latency=100 ! "
            f"rtpjitterbuffer ! "
            f"rtph264depay ! "  # Será ajustado dinamicamente
            f"h264parse ! "     # Será ajustado dinamicamente  
            f"mpegtsmux alignment=7 ! "  # Adiciona alinhamento para PTS
            f"srtsink uri={srt_uri}"
        )
        
        return pipeline
    
    def _on_bus_message(self, bus: Gst.Bus, message: Gst.Message):
        """Handler para mensagens do bus GStreamer"""
        msg_type = message.type
        
        if msg_type == Gst.MessageType.ERROR:
            error, debug = message.parse_error()
            error_msg = f"Erro no pipeline: {error.message}"
            if debug:
                error_msg += f" (Debug: {debug})"
            
            logger.error(error_msg)
            self.metrics.last_error = error_msg
            self.metrics.current_state = PipelineState.ERROR
            
            # Tentar reconectar
            self._schedule_reconnection("error")
            
        elif msg_type == Gst.MessageType.EOS:
            logger.warning("Fim do stream (EOS) recebido")
            self._schedule_reconnection("eos")
            
        elif msg_type == Gst.MessageType.WARNING:
            warning, debug = message.parse_warning()
            logger.warning(f"Aviso: {warning.message}")
            
        elif msg_type == Gst.MessageType.STATE_CHANGED:
            if message.src == self.pipeline:
                old_state, new_state, pending = message.parse_state_changed()
                logger.debug(f"Estado mudou: {old_state.value_nick} -> {new_state.value_nick}")
                
                if new_state == Gst.State.PLAYING:
                    self.metrics.current_state = PipelineState.RUNNING
                    self.backoff.reset()  # Reset backoff em caso de sucesso
                    logger.info("Pipeline rodando com sucesso")
                    
        elif msg_type == Gst.MessageType.STREAM_STATUS:
            status_type, owner = message.parse_stream_status()
            logger.debug(f"Status do stream: {status_type.value_nick}")
    
    def _schedule_reconnection(self, reason: str):
        """Agenda uma reconexão"""
        if not self.running:
            return
            
        logger.warning(f"Agendando reconexão devido a: {reason}")
        self.metrics.current_state = PipelineState.RECONNECTING
        
        # Parar pipeline atual
        if self.pipeline:
            self.pipeline.set_state(Gst.State.NULL)
        
        # Iniciar thread de reconexão se não estiver rodando
        if not self.reconnect_thread or not self.reconnect_thread.is_alive():
            self.reconnect_thread = threading.Thread(target=self._reconnect_loop)
            self.reconnect_thread.daemon = True
            self.reconnect_thread.start()
    
    def _reconnect_loop(self):
        """Loop de reconexão com exponential backoff"""
        while self.running:
            try:
                self.backoff.wait()
                
                if not self.running:
                    break
                
                logger.info("Tentando reconectar...")
                self.metrics.total_reconnections += 1
                
                if self.use_gstreamer:
                    # Reconexão GStreamer
                    self.pipeline = self.create_pipeline()
                    
                    # Tentar iniciar
                    ret = self.pipeline.set_state(Gst.State.PLAYING)
                    if ret == Gst.StateChangeReturn.FAILURE:
                        logger.error("Falha ao iniciar pipeline GStreamer na reconexão")
                        continue
                    
                    # Aguardar um pouco para verificar se está estável
                    time.sleep(5)
                    
                    if self.pipeline:
                        state, _, _ = self.pipeline.get_state(Gst.CLOCK_TIME_NONE)
                        if state == Gst.State.PLAYING:
                            logger.info("Reconexão GStreamer bem-sucedida!")
                            return
                else:
                    # Reconexão FFmpeg
                    self.ffmpeg_process = self.create_ffmpeg_process()
                    
                    # Aguardar um pouco para verificar se iniciou
                    time.sleep(3)
                    
                    if self.ffmpeg_process.poll() is None:
                        logger.info("Reconexão FFmpeg bem-sucedida!")
                        # Reiniciar monitoramento
                        ffmpeg_thread = threading.Thread(target=self._monitor_ffmpeg)
                        ffmpeg_thread.daemon = True
                        ffmpeg_thread.start()
                        return
                    else:
                        logger.error("Falha ao iniciar FFmpeg na reconexão")
                
            except Exception as e:
                logger.error(f"Erro durante reconexão: {e}")
                self.metrics.last_error = str(e)
    
    def start(self):
        """Inicia o pipeline"""
        try:
            self.running = True
            self.metrics.reset()
            self.metrics.current_state = PipelineState.STARTING
            
            logger.info("Iniciando pipeline RTSP -> SRT")
            logger.info(f"RTSP URL: {self.rtsp_url}")
            logger.info(f"SRT: {self.srt_host}:{self.srt_port}")
            if self.srt_streamid:
                logger.info(f"SRT Stream ID: {self.srt_streamid}")
            
            if self.use_gstreamer:
                # Usar GStreamer
                self.pipeline = self.create_pipeline()
                
                # Iniciar pipeline
                ret = self.pipeline.set_state(Gst.State.PLAYING)
                if ret == Gst.StateChangeReturn.FAILURE:
                    raise RuntimeError("Falha ao iniciar pipeline GStreamer")
                
                # Criar loop principal
                self.loop = GLib.MainLoop()
                
                # Configurar handlers de sinal
                signal.signal(signal.SIGINT, self._signal_handler)
                signal.signal(signal.SIGTERM, self._signal_handler)
                
                # Iniciar thread de métricas
                metrics_thread = threading.Thread(target=self._metrics_loop)
                metrics_thread.daemon = True
                metrics_thread.start()
                
                logger.info("Pipeline GStreamer iniciado, aguardando...")
                self.loop.run()
            else:
                # Usar FFmpeg
                self.ffmpeg_process = self.create_ffmpeg_process()
                
                # Configurar handlers de sinal
                signal.signal(signal.SIGINT, self._signal_handler)
                signal.signal(signal.SIGTERM, self._signal_handler)
                
                # Iniciar thread de métricas
                metrics_thread = threading.Thread(target=self._metrics_loop)
                metrics_thread.daemon = True
                metrics_thread.start()
                
                # Iniciar thread de monitoramento do FFmpeg
                ffmpeg_thread = threading.Thread(target=self._monitor_ffmpeg)
                ffmpeg_thread.daemon = True
                ffmpeg_thread.start()
                
                logger.info("Pipeline FFmpeg iniciado, aguardando...")
                # Aguardar processo FFmpeg
                self.ffmpeg_process.wait()
            
        except Exception as e:
            logger.error(f"Erro ao iniciar pipeline: {e}")
            self.metrics.last_error = str(e)
            self.metrics.current_state = PipelineState.ERROR
            raise
    
    def _metrics_loop(self):
        """Loop para log de métricas"""
        while self.running:
            time.sleep(30)  # Log a cada 30 segundos
            if self.metrics.current_state == PipelineState.RUNNING:
                uptime = self.metrics.get_uptime()
                logger.info(
                    f"Métricas - Estado: {self.metrics.current_state.value}, "
                    f"Uptime: {uptime:.1f}s, "
                    f"Reconexões: {self.metrics.total_reconnections}"
                )
    
    def _signal_handler(self, signum, frame):
        """Handler para sinais de shutdown"""
        logger.info(f"Recebido sinal {signum}, parando pipeline...")
        self.stop()
    
    def _monitor_ffmpeg(self):
        """Monitora processo FFmpeg"""
        if not self.ffmpeg_process:
            return
            
        while self.running and self.ffmpeg_process.poll() is None:
            time.sleep(1)
        
        if self.running:
            # FFmpeg parou inesperadamente
            returncode = self.ffmpeg_process.returncode
            if returncode != 0:
                logger.error(f"FFmpeg parou com código {returncode}")
                stderr = self.ffmpeg_process.stderr.read() if self.ffmpeg_process.stderr else ""
                if stderr:
                    logger.error(f"Erro FFmpeg: {stderr}")
                self._schedule_reconnection("ffmpeg_error")
    
    def stop(self):
        """Para o pipeline"""
        logger.info("Parando pipeline...")
        self.running = False
        self.metrics.current_state = PipelineState.STOPPED
        
        if self.pipeline:
            self.pipeline.set_state(Gst.State.NULL)
            
        if self.ffmpeg_process and self.ffmpeg_process.poll() is None:
            self.ffmpeg_process.terminate()
            try:
                self.ffmpeg_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.ffmpeg_process.kill()
            
        if self.loop:
            self.loop.quit()
            
        logger.info("Pipeline parado")


def main():
    """Função principal"""
    # Configurações via variáveis de ambiente
    rtsp_url = os.getenv('RTSP_URL', 'rtsp://localhost:8554/cam1')
    srt_host = os.getenv('SRT_HOST', '127.0.0.1')
    srt_port = int(os.getenv('SRT_PORT', '9999'))
    srt_streamid = os.getenv('SRT_STREAMID', '')
    
    logger.info("Iniciando RTSP to SRT Pipeline")
    logger.info(f"Configuração:")
    logger.info(f"  RTSP URL: {rtsp_url}")
    logger.info(f"  SRT Host: {srt_host}")
    logger.info(f"  SRT Port: {srt_port}")
    if srt_streamid:
        logger.info(f"  SRT Stream ID: {srt_streamid}")
    
    try:
        pipeline = RTSPToSRTPipeline(rtsp_url, srt_host, srt_port, srt_streamid)
        pipeline.start()
    except KeyboardInterrupt:
        logger.info("Interrompido pelo usuário")
    except Exception as e:
        logger.error(f"Erro fatal: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
