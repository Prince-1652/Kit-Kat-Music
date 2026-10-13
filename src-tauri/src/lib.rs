pub mod tray;
pub mod window;
pub mod ytdlp;

use tauri::{AppHandle, Builder, Manager, WindowEvent};

pub fn open_settings_window(app: &AppHandle) {
    if let Some(win) = app.get_webview_window("settings") {
        let _ = win.show();
        let _ = win.unminimize();
        let _ = win.set_focus();
    }
}

#[tauri::command]
fn open_settings(app: AppHandle) {
    open_settings_window(&app);
}

#[tauri::command]
fn close_settings(app: AppHandle) {
    if let Some(win) = app.get_webview_window("settings") {
        let _ = win.hide();
    }
}

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
            let handle = app.handle().clone();
            window::setup_window(&handle);
            let _ = tray::build_tray(&handle);
            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() == "settings" {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_yt_dlp_status,
            install_yt_dlp,
            search_music,
            get_stream_url,
            update_island_shape,
            open_settings,
            close_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running KitKat application");
}
