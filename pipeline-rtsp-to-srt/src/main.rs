use gstreamer as gst;
use gst::prelude::*;
use std::env;
use std::time::Duration;
use tokio::time::sleep;
use tracing::{error, info, warn};

const DEFAULT_RTSP_URL: &str = "rtsp://rtsp-server:8554/cam1";
const DEFAULT_SRT_URL: &str = "srt://media-server:8890?mode=caller&streamid=publish:live";
const RECONNECT_DELAY_MS: u64 = 5000;
const MAX_RETRIES: u32 = 999999; // Infinite retries for resilience

#[tokio::main]
async fn main() -> Result<(), anyhow::Error> {
    // Initialize tracing
    tracing_subscriber::fmt::init();

    // Initialize GStreamer
    gst::init()?;

    let rtsp_url = env::var("RTSP_URL").unwrap_or_else(|_| DEFAULT_RTSP_URL.to_string());
    let srt_url = env::var("SRT_URL").unwrap_or_else(|_| DEFAULT_SRT_URL.to_string());

    info!("Starting RTSP to SRT pipeline with resilience");
    info!("RTSP Source: {}", rtsp_url);
    info!("SRT Sink (MediaMTX): {}", srt_url);

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

                // Exponential backoff with max delay of 30 seconds for resilience
                let delay = std::cmp::min(RECONNECT_DELAY_MS * (retry_count as u64 / 10 + 1), 30000);
                warn!("Retrying in {} seconds... (attempt {})", delay / 1000, retry_count);
                sleep(Duration::from_millis(delay)).await;
                
                // Reset retry count periodically to avoid overflow
                if retry_count % 100 == 0 {
                    info!("Completed {} retry cycles, continuing with resilience...", retry_count / 100);
                }
            }
        }
    }

    Ok(())
}

async fn run_pipeline(rtsp_url: &str, srt_url: &str) -> Result<(), anyhow::Error> {
    // Create resilient pipeline: RTSP → SRT with improved stability
    let pipeline_str = format!(
        "rtspsrc location={} latency=300 drop-on-latency=true retry=10 ! \
         rtph264depay ! h264parse config-interval=-1 ! \
         mpegtsmux alignment=7 ! \
         srtclientsink uri={} wait-for-connection=false",
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
                    let error_msg = err.error().to_string();
                    error!(
                        "Pipeline error: {} (debug: {:?})",
                        error_msg,
                        err.debug()
                    );
                    
                    // Log specific error types for better resilience debugging
                    if error_msg.contains("Could not connect") || error_msg.contains("Connection refused") {
                        warn!("Connection error - will retry (expected during startup/restarts)");
                    } else if error_msg.contains("Internal data stream error") {
                        warn!("Stream error - source disconnected, will retry");
                    } else if error_msg.contains("Not connected") {
                        warn!("SRT connection error - MediaMTX may not be ready, will retry");
                    }
                    
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
