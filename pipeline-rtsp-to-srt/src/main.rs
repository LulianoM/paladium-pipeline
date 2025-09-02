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
    
    app_state.lock().unwrap().pipeline.set_state(gst::State::Playing)?;

    main_loop.run();

    Ok(())
}

fn build_pipeline() -> Result<gst::Pipeline, anyhow::Error> {
    let rtsp_source_uri = "rtsp://pipeline1:8555/cam1";
    let srt_sink_uri = "srt://pipeline3:8888?mode=caller&streamid=publish:cam1";

    println!("🔗 Conectando RTSP: {}", rtsp_source_uri);
    println!("🔗 Conectando SRT: {}", srt_sink_uri);

    let pipeline_str = format!(
        "rtspsrc location={} ! rtph264depay ! h264parse ! fakesink",
        rtsp_source_uri
    );

    println!("🔧 Pipeline GStreamer: {}", pipeline_str);

    let pipeline = gst::parse_launch(&pipeline_str)?
        .downcast::<gst::Pipeline>()
        .map_err(|_| anyhow::anyhow!("Failed to create pipeline"))?;

    Ok(pipeline)
}

fn handle_pipeline_message(app_state: Arc<Mutex<AppState>>, msg: &gst::Message) {
    match msg.view() {
        gst::MessageView::Error(err) => {
            println!("❌ Erro no pipeline: {:?}", err);
            println!("❌ Detalhes do erro: {}", err.error());
            println!("❌ Debug info: {:?}", err.debug());
            let mut state = app_state.lock().unwrap();
            if !state.is_reconnecting {
                state.is_reconnecting = true;
                println!("🔥 Erro detectado. Agendando reconexão...");
                
                state.pipeline.set_state(gst::State::Null).ok();
                
                schedule_pipeline_restart(app_state.clone());
            }
        }
        gst::MessageView::Eos(_) => {
            println!("📺 Stream finalizado (EOS)");
            let mut state = app_state.lock().unwrap();
            if !state.is_reconnecting {
                state.is_reconnecting = true;
                println!("🔥 EOS detectado. Agendando reconexão...");
                
                state.pipeline.set_state(gst::State::Null).ok();
                
                schedule_pipeline_restart(app_state.clone());
            }
        }
        gst::MessageView::StateChanged(state_changed) => {
            if let Some(element) = state_changed.src() {
                if element.name() == "pipeline0" {
                    let old_state = state_changed.old();
                    let new_state = state_changed.current();
                    println!("🔄 Pipeline state changed: {:?} -> {:?}", old_state, new_state);
                }
            }
        }
        gst::MessageView::StreamStart(_) => {
            println!("🚀 Stream iniciado!");
        }
        gst::MessageView::Warning(warn) => {
            println!("⚠️ Aviso: {:?}", warn);
            println!("⚠️ Detalhes: {}", warn.error());
        }
        gst::MessageView::Info(info) => {
            println!("ℹ️ Info: {:?}", info);
        }
        _ => {
            println!("🔍 Mensagem recebida: {:?}", msg.type_());
        }
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
             state.is_reconnecting = false; 
        }
    });
}