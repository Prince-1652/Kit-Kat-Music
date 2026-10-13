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

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[tauri::command]
fn get_launch_at_startup() -> Result<bool, String> {
    #[cfg(target_os = "windows")]
    {
        let mut cmd = std::process::Command::new("reg");
        cmd.args(["query", r"HKCU\Software\Microsoft\Windows\CurrentVersion\Run", "/v", "KitKatMusic"]);
        cmd.creation_flags(0x08000000);
        let output = cmd.output().map_err(|e| e.to_string())?;
        Ok(output.status.success())
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok(false)
    }
}

#[tauri::command]
fn set_launch_at_startup(enable: bool) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        if enable {
            let exe_path = std::env::current_exe().map_err(|e| e.to_string())?;
            let exe_str = format!("\"{}\"", exe_path.to_string_lossy());
            let mut cmd = std::process::Command::new("reg");
            cmd.args([
                "add",
                r"HKCU\Software\Microsoft\Windows\CurrentVersion\Run",
                "/v",
                "KitKatMusic",
                "/t",
                "REG_SZ",
                "/d",
                &exe_str,
                "/f",
            ]);
            cmd.creation_flags(0x08000000);
            let status = cmd.status().map_err(|e| e.to_string())?;
            if !status.success() {
                return Err("Failed to enable launch at startup in registry".into());
            }
        } else {
            let mut cmd = std::process::Command::new("reg");
            cmd.args([
                "delete",
                r"HKCU\Software\Microsoft\Windows\CurrentVersion\Run",
                "/v",
                "KitKatMusic",
                "/f",
            ]);
            cmd.creation_flags(0x08000000);
            let _ = cmd.status();
        }
        Ok(())
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok(())
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
            get_launch_at_startup,
            set_launch_at_startup,
        ])
        .run(tauri::generate_context!())
        .expect("error while running KitKat application");
}
