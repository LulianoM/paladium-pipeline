use gstreamer as gst;
use gst::{glib, prelude::*};
use std::{
    sync::{Arc, Mutex},
    thread,
    time::Duration,
};

struct AppState {
    pipeline: gst::Pipeline,
    is_reconnecting: bool,
}

fn main() -> Result<(), anyhow::Error> {
    gst::init()?;

    let main_loop = glib::MainLoop::new(None, false);

    let pipeline = build_pipeline()?;

    let app_state = Arc::new(Mutex::new(AppState {
        pipeline,
        is_reconnecting: false,
    }));

    let bus_app_state = Arc::clone(&app_state);
    let bus = app_state.lock().unwrap().pipeline.bus().unwrap();
    bus.add_watch(move |_, msg| {
        handle_pipeline_message(bus_app_state.clone(), msg);
        glib::ControlFlow::Continue
    })?;

    println!("✅ Pipeline 2: Ponte RTSP -> SRT iniciada.");
    println!("🕒 Tentando conectar ao stream RTSP...");
    
    // Agora, ao dar Play, o MainLoop já existe e pode dar suporte ao rtspsrc.
    app_state.lock().unwrap().pipeline.set_state(gst::State::Playing)?;

    // Liga o "motor" de eventos.
    main_loop.run();

    Ok(())
}

fn build_pipeline() -> Result<gst::Pipeline, anyhow::Error> {
    let rtsp_source_uri = "rtsp://pipeline1:8554/cam1";
    let srt_sink_uri = "srt://pipeline3:8888?mode=caller&streamid=publish:cam1";

    let pipeline_str = format!(
        "rtspsrc location={} latency=200 protocols=tcp ! application/x-rtp, media=(string)video, clock-rate=(int)90000, encoding-name=(string)H264 ! rtph264depay ! h264parse ! srtclientsink uri={}",
        rtsp_source_uri, srt_sink_uri
    );

    let pipeline = gst::parse_launch(&pipeline_str)?
        .downcast::<gst::Pipeline>()
        .map_err(|_| anyhow::anyhow!("Failed to create pipeline"))?;

    Ok(pipeline)
}

fn handle_pipeline_message(app_state: Arc<Mutex<AppState>>, msg: &gst::Message) {
    match msg.view() {
        gst::MessageView::Error(_) | gst::MessageView::Eos(_) => {
            let mut state = app_state.lock().unwrap();
            if !state.is_reconnecting {
                state.is_reconnecting = true;
                println!("🔥 Erro ou desconexão detectada. Agendando reconexão...");
                
                // Para o pipeline antes de agendar o reinício
                state.pipeline.set_state(gst::State::Null).ok();
                
                // Para simplificar, vamos apenas reiniciar o estado do pipeline existente
                // em vez de reconstruir tudo.
                schedule_pipeline_restart(app_state.clone());
            }
        }
        _ => (),
    }
}

fn schedule_pipeline_restart(app_state: Arc<Mutex<AppState>>) {
    thread::spawn(move || {
        println!("🕒 Agendando reinício do pipeline em 5 segundos...");
        thread::sleep(Duration::from_secs(5));
        
        println!("🚀 Tentando reiniciar o pipeline...");
        let mut state = app_state.lock().unwrap();
        if state.pipeline.set_state(gst::State::Playing).is_ok() {
            println!("✅ Pipeline reiniciado com sucesso!");
            state.is_reconnecting = false;
        } else {
             eprintln!("❌ Falha ao reiniciar o pipeline. Nova tentativa em breve...");
             // A lógica de watch no barramento vai pegar essa falha e agendar de novo.
             state.is_reconnecting = false; 
        }
    });
}