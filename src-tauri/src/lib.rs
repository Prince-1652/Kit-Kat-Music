pub mod window;
pub mod ytdlp;

use tauri::{Builder, Manager};

#[tauri::command]
async fn get_yt_dlp_status() -> Result<ytdlp::YtDlpStatus, String> {
    ytdlp::check_status().await
}

#[tauri::command]
async fn install_yt_dlp() -> Result<(), String> {
    ytdlp::download_ytdlp().await
}

#[tauri::command]
async fn search_music(query: String) -> Result<Vec<ytdlp::TrackMetadata>, String> {
    ytdlp::search_tracks(query).await
}

#[tauri::command]
async fn get_stream_url(video_id: String) -> Result<ytdlp::StreamPayload, String> {
    ytdlp::extract_stream_url(video_id).await
}

#[tauri::command]
fn update_island_shape(
    window: tauri::WebviewWindow,
    x: f64,
    y: f64,
    w: f64,
    h: f64,
    collapsed: bool,
) {
    if let Some(state) = window.try_state::<window::WindowManager>() {
        state.set_rect(
            window::IslandRect { x, y, w, h },
            collapsed,
        );
    }
}

pub fn run() {
    Builder::default()
        .manage(window::WindowManager::new())
        .setup(|app| {
            window::setup_window(&app.handle());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_yt_dlp_status,
            install_yt_dlp,
            search_music,
            get_stream_url,
            update_island_shape,
        ])
        .run(tauri::generate_context!())
        .expect("error while running KitKat application");
}
