use std::path::{Path, PathBuf};
use std::process::Stdio;
use serde::{Deserialize, Serialize};
use tokio::process::Command;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct YtDlpStatus {
    pub installed: bool,
    pub path: Option<String>,
    pub version: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TrackMetadata {
    pub id: String,
    pub title: String,
    pub uploader: String,
    pub duration_secs: Option<u64>,
    pub thumbnail_url: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct StreamPayload {
    pub stream_url: String,
    pub title: String,
    pub artist: String,
    pub thumbnail_url: Option<String>,
    pub duration_secs: Option<u64>,
}

fn create_command<P: AsRef<Path>>(bin: P) -> Command {
    let mut cmd = Command::new(bin.as_ref());
    #[cfg(windows)]
    cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    cmd
}

pub fn get_local_ytdlp_path() -> PathBuf {
    let local_data = dirs_local_data().unwrap_or_else(|| PathBuf::from("."));
    let bin_dir = local_data.join("Kitkat").join("bin");
    let _ = std::fs::create_dir_all(&bin_dir);
    bin_dir.join("yt-dlp.exe")
}

fn dirs_local_data() -> Option<PathBuf> {
    std::env::var_os("LOCALAPPDATA").map(PathBuf::from)
}

pub async fn resolve_ytdlp_bin() -> Option<PathBuf> {
    // 1. Check local data directory
    let local = get_local_ytdlp_path();
    if local.exists() {
        return Some(local);
    }
    // 2. Check system PATH
    if let Ok(output) = create_command("yt-dlp")
        .arg("--version")
        .output()
        .await
    {
        if output.status.success() {
            return Some(PathBuf::from("yt-dlp"));
        }
    }
    None
}

pub async fn check_status() -> Result<YtDlpStatus, String> {
    if let Some(path) = resolve_ytdlp_bin().await {
        let output = create_command(&path)
            .arg("--version")
            .output()
            .await
            .map_err(|e| e.to_string())?;

        let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
        Ok(YtDlpStatus {
            installed: true,
            path: Some(path.to_string_lossy().to_string()),
            version: Some(version),
        })
    } else {
        Ok(YtDlpStatus {
            installed: false,
            path: None,
            version: None,
        })
    }
}

pub async fn download_ytdlp() -> Result<(), String> {
    let target_path = get_local_ytdlp_path();
    let url = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe";

    let response = reqwest::get(url)
        .await
        .map_err(|e| format!("Failed to reach GitHub release: {e}"))?;

    if !response.status().is_success() {
        return Err(format!("Download failed with status: {}", response.status()));
    }

    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read stream: {e}"))?;

    // Atomic write via temporary file to prevent leaving corrupt binary on failure
    let tmp_path = target_path.with_extension("exe.part");
    tokio::fs::write(&tmp_path, bytes)
        .await
        .map_err(|e| format!("Failed to write yt-dlp binary: {e}"))?;

    tokio::fs::rename(&tmp_path, &target_path)
        .await
        .map_err(|e| format!("Failed to finalize yt-dlp binary: {e}"))?;

    Ok(())
}

pub async fn search_tracks(query: String) -> Result<Vec<TrackMetadata>, String> {
    let q = query.trim();
    if q.is_empty() {
        return Ok(Vec::new());
    }

    let bin = resolve_ytdlp_bin()
        .await
        .ok_or_else(|| "yt-dlp is not installed".to_string())?;

    let search_arg = format!("ytsearch8:{}", q);
    let output = create_command(bin)
        .args([
            "--dump-single-json",
            "--flat-playlist",
            "--no-warnings",
            "--default-search",
            "ytsearch",
            &search_arg,
        ])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .await
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        let err_msg = String::from_utf8_lossy(&output.stderr);
        return Err(if err_msg.trim().is_empty() {
            "Search process failed".to_string()
        } else {
            err_msg.trim().to_string()
        });
    }

    let json: serde_json::Value = serde_json::from_slice(&output.stdout)
        .map_err(|e| format!("Failed to parse yt-dlp json: {e}"))?;

    let mut results = Vec::new();
    if let Some(entries) = json.get("entries").and_then(|e| e.as_array()) {
        for entry in entries {
            let id = entry.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
            if id.is_empty() { continue; }
            let title = entry.get("title").and_then(|v| v.as_str()).unwrap_or("Unknown").to_string();
            let uploader = entry.get("uploader").or_else(|| entry.get("channel")).and_then(|v| v.as_str()).unwrap_or("Unknown").to_string();
            let duration_secs = entry.get("duration").and_then(|v| v.as_u64());
            let thumbnail_url = entry.get("thumbnails")
                .and_then(|t| t.as_array())
                .and_then(|arr| arr.last())
                .and_then(|thumb| thumb.get("url"))
                .and_then(|u| u.as_str())
                .or_else(|| entry.get("thumbnail").and_then(|t| t.as_str()))
                .map(|s| s.to_string());

            results.push(TrackMetadata {
                id,
                title,
                uploader,
                duration_secs,
                thumbnail_url,
            });
        }
    }

    Ok(results)
}

pub async fn extract_stream_url(video_id: String) -> Result<StreamPayload, String> {
    let vid = video_id.trim();
    if vid.is_empty() {
        return Err("video_id cannot be empty".to_string());
    }

    let bin = resolve_ytdlp_bin()
        .await
        .ok_or_else(|| "yt-dlp is not installed".to_string())?;

    let url = format!("https://www.youtube.com/watch?v={}", vid);
    let output = create_command(bin)
        .args([
            "-g",
            "-f",
            "ba[ext=m4a]/ba/b",
            "--no-playlist",
            "--no-warnings",
            &url,
        ])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .await
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("yt-dlp failed: {}", stderr.trim()));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stream_url = stdout
        .lines()
        .map(|s| s.trim())
        .filter(|s| s.starts_with("http"))
        .last()
        .ok_or_else(|| "No valid stream URL returned by yt-dlp".to_string())?
        .to_string();

    Ok(StreamPayload {
        stream_url,
        title: String::new(),
        artist: String::new(),
        thumbnail_url: None,
        duration_secs: None,
    })
}
