
use gstreamer as gst;
use gstreamer_rtsp_server as gst_rtsp_server;
use gstreamer_rtsp_server::prelude::*;
use gst::prelude::*;
use std::env;

fn main() -> Result<(), anyhow::Error> {
    // Initialize GStreamer
    gst::init()?;

    let main_loop = glib::MainLoop::new(None, false);

    // Create a new RTSP server
    let server = gst_rtsp_server::RTSPServer::new();
    server.set_service("8554");

    // Get the mount points for the server
    let mounts = server
        .mount_points()
        .ok_or_else(|| anyhow::anyhow!("Could not get mount points"))?;

    // Get video path from environment
    let video_path = env::var("VIDEO_PATH").unwrap_or_else(|_| "./sinners.mp4".to_string());

    // Create a new media factory with loop
    let factory = gst_rtsp_server::RTSPMediaFactory::new();
    let launch_string = format!(
        "( multifilesrc location={} loop=true ! qtdemux name=d d.video_0 ! h264parse ! rtph264pay name=pay0 pt=96 )",
        video_path
    );
    factory.set_launch(&launch_string);
    factory.set_shared(true);

    // Attach the factory to the mount point
    mounts.add_factory("/cam1", factory);

    // Attach the server to the main context
    let server_id = server.attach(None)?;

    println!("Stream ready at rtsp://127.0.0.1:8554/cam1");
    main_loop.run();

    // Detach the server
    server_id.remove();

    Ok(())
}