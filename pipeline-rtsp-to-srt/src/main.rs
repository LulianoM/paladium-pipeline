use gstreamer as gst;
use gst::prelude::*;
use std::{
    sync::{Arc, Mutex},
    thread,
    time::Duration,
};

// Armazena o estado da reconexão para evitar múltiplas tentativas simultâneas
struct AppState {
    pipeline: gst::Pipeline,
    is_reconnecting: bool,
}

fn main() -> Result<(), anyhow::Error> {
    gst::init()?;

    let pipeline = build_pipeline()?;

    let app_state = Arc::new(Mutex::new(AppState {
        pipeline,
        is_reconnecting: false,
    }));

    let app_state_clone = Arc::clone(&app_state);
    let bus = app_state.lock().unwrap().pipeline.bus().unwrap();

    bus.add_watch(move |_, msg| {
        // Usamos o clone aqui, sem necessidade de clonar novamente a cada mensagem
        handle_pipeline_message(&app_state_clone, msg);
        
        gst::glib::ControlFlow::Continue
    })?;

    println!("✅ Pipeline 2: Ponte RTSP -> SRT iniciada.");
    println!("🕒 Tentando conectar ao stream RTSP...");
    app_state.lock().unwrap().pipeline.set_state(gst::State::Playing)?;

    let main_loop = glib::MainLoop::new(None, false);
    main_loop.run();

    Ok(())
}

fn build_pipeline() -> Result<gst::Pipeline, anyhow::Error> {
    let rtsp_source_uri = "rtsp://pipeline1:8554/cam1";
    let srt_sink_uri = "srt://pipeline3:8888?mode=caller";

    let pipeline_str = format!(
        "rtspsrc location={} latency=200 ! rtph264depay ! h264parse ! mpegtsmux ! srtclientsink uri={}",
        rtsp_source_uri, srt_sink_uri
    );

    let pipeline = gst::parse_launch(&pipeline_str)?
        .downcast::<gst::Pipeline>()
        .map_err(|_| anyhow::anyhow!("Failed to create pipeline"))?;

    Ok(pipeline)
}

fn handle_pipeline_message(app_state: &Arc<Mutex<AppState>>, msg: &gst::Message) {
    match msg.view() {
        gst::MessageView::Error(_) | gst::MessageView::Eos(_) => {
            let mut state = app_state.lock().unwrap();
            if !state.is_reconnecting {
                state.is_reconnecting = true;
                println!("🔥 Erro ou desconexão detectada. Iniciando processo de reconexão...");
                schedule_reconnect(Arc::clone(app_state));
            }
        }
        _ => (),
    }
}

fn schedule_reconnect(app_state: Arc<Mutex<AppState>>) {
    let pipeline = app_state.lock().unwrap().pipeline.clone();
    
    pipeline.set_state(gst::State::Null).ok();
    
    thread::spawn(move || {
        let mut attempt = 1;
        loop {
            let delay_secs = (2u64.pow(attempt.min(5))).min(30);
            println!("🕒 Tentativa de reconexão #{}. Próxima tentativa em {} segundos.", attempt, delay_secs);
            thread::sleep(Duration::from_secs(delay_secs));

            if let Ok(mut state) = app_state.lock() {
                if state.pipeline.set_state(gst::State::Playing).is_ok() {
                    println!("✅ Reconexão bem-sucedida!");
                    state.is_reconnecting = false;
                    break;
                }
            } else {
                eprintln!("Não foi possível obter o lock do estado da aplicação. Abortando reconexão.");
                break;
            }
            attempt += 1;
        }
    });
}