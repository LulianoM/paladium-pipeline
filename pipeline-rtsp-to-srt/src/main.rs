use gstreamer as gst;
use gst::prelude::*;
use std::env;
use std::time::Duration;
use tokio::time::sleep;
use tracing::{error, info, warn};

const DEFAULT_RTSP_URL: &str = "rtsp://rtsp-server:8554/cam1";
const DEFAULT_SRT_URL: &str = "srt://0.0.0.0:9999?mode=listener";
const RECONNECT_DELAY_MS: u64 = 5000;
const MAX_RETRIES: u32 = 10;

#[tokio::main]
async fn main() -> Result<(), anyhow::Error> {
    // Initialize tracing
    tracing_subscriber::fmt::init();

    // Initialize GStreamer
    gst::init()?;

    let rtsp_url = env::var("RTSP_URL").unwrap_or_else(|_| DEFAULT_RTSP_URL.to_string());
    let srt_url = env::var("SRT_URL").unwrap_or_else(|_| DEFAULT_SRT_URL.to_string());

    info!("Starting RTSP to SRT pipeline");
    info!("RTSP Source: {}", rtsp_url);
    info!("SRT Sink: {}", srt_url);

    let mut retry_count = 0;

    loop {
        match run_pipeline(&rtsp_url, &srt_url).await {
            Ok(_) => {
                info!("Pipeline completed successfully");
                break;
            }
            Err(e) => {
                retry_count += 1;
                error!("Pipeline failed (attempt {}): {}", retry_count, e);
                
                if retry_count >= MAX_RETRIES {
                    error!("Max retries reached, exiting");
                    return Err(e);
                }

                warn!("Retrying in {} seconds...", RECONNECT_DELAY_MS / 1000);
                sleep(Duration::from_millis(RECONNECT_DELAY_MS)).await;
            }
        }
    }

    Ok(())
}

async fn run_pipeline(rtsp_url: &str, srt_url: &str) -> Result<(), anyhow::Error> {
    // Create the pipeline
                    let pipeline_str = format!(
                    "rtspsrc location={} latency=300 ! rtph264depay ! h264parse ! mpegtsmux ! srtclientsink uri={} streamid=publish:live",
                    rtsp_url, srt_url
                );

    info!("Creating pipeline: {}", pipeline_str);

    let pipeline = gst::parse::launch(&pipeline_str)?;
    let pipeline = pipeline
        .downcast::<gst::Pipeline>()
        .map_err(|_| anyhow::anyhow!("Failed to downcast to Pipeline"))?;

    // Set up bus watch
    let bus = pipeline
        .bus()
        .ok_or_else(|| anyhow::anyhow!("Failed to get bus"))?;

    // Start playing
    pipeline.set_state(gst::State::Playing)?;
    info!("Pipeline started");

    // Wait for messages
    let mut error_occurred = false;
    let mut eos_received = false;

    while !error_occurred && !eos_received {
        if let Some(msg) = bus.timed_pop(gst::ClockTime::from_seconds(1)) {
            match msg.view() {
                gst::MessageView::Error(err) => {
                    error!(
                        "Pipeline error: {} (debug: {:?})",
                        err.error(),
                        err.debug()
                    );
                    error_occurred = true;
                }
                gst::MessageView::Warning(warn_msg) => {
                    warn!(
                        "Pipeline warning: {:?}",
                        warn_msg
                    );
                }
                gst::MessageView::Info(info_msg) => {
                    info!(
                        "Pipeline info: {:?}",
                        info_msg
                    );
                }
                gst::MessageView::Eos(_) => {
                    info!("End of stream received");
                    eos_received = true;
                }
                gst::MessageView::StateChanged(state_changed) => {
                    if let Some(src) = state_changed.src() {
                        if src == &pipeline {
                            info!(
                                "Pipeline state changed: {:?} -> {:?}",
                                state_changed.old(),
                                state_changed.current()
                            );
                        }
                    }
                }
                _ => {}
            }
        }
    }

    // Stop the pipeline
    pipeline.set_state(gst::State::Null)?;

    if error_occurred {
        Err(anyhow::anyhow!("Pipeline encountered an error"))
    } else {
        Ok(())
    }
}
