use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{AppHandle, Emitter};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct UpdateInfo {
    pub available: bool,
    pub current_version: String,
    pub latest_version: String,
    pub release_notes: String,
    pub download_url: Option<String>,
    pub asset_name: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct UpdateProgress {
    pub percent: u8,
    pub downloaded_bytes: u64,
    pub total_bytes: u64,
}

#[derive(Deserialize, Debug)]
struct GitHubAsset {
    name: String,
    browser_download_url: String,
}

#[derive(Deserialize, Debug)]
struct GitHubRelease {
    tag_name: String,
    body: Option<String>,
    assets: Vec<GitHubAsset>,
}

fn parse_semver_parts(v: &str) -> [u32; 3] {
    let mut parts = [0u32; 3];
    let cleaned = v.trim().trim_start_matches('v');
    for (i, p) in cleaned.split('.').take(3).enumerate() {
        parts[i] = p.parse().unwrap_or(0);
    }
    parts
}

pub fn is_newer_version(current: &str, latest: &str) -> bool {
    let c = parse_semver_parts(current);
    let l = parse_semver_parts(latest);

    for i in 0..3 {
        if l[i] > c[i] {
            return true;
        }
        if l[i] < c[i] {
            return false;
        }
    }
    false
}

pub async fn check_github_update() -> Result<UpdateInfo, String> {
    let current_version = env!("CARGO_PKG_VERSION").to_string();
    let url = "https://api.github.com/repos/Prince-1652/Kit-Kat-Music/releases/latest";

    let client = reqwest::Client::builder()
        .user_agent("KitKat-Desktop-App")
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client
        .get(url)
        .send()
        .await
        .map_err(|e| format!("Failed to reach GitHub releases: {e}"))?;

    if !resp.status().is_success() {
        return Err(format!("GitHub API returned HTTP {}", resp.status()));
    }

    let release: GitHubRelease = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse release payload: {e}"))?;

    let latest_version = release.tag_name.clone();
    let available = is_newer_version(&current_version, &latest_version);

    let installer_asset = release.assets.into_iter().find(|a| {
        let n = a.name.to_lowercase();
        n.ends_with(".exe") || n.ends_with(".msi")
    });

    let (download_url, asset_name) = match installer_asset {
        Some(a) => (Some(a.browser_download_url), Some(a.name)),
        None => (None, None),
    };

    Ok(UpdateInfo {
        available,
        current_version,
        latest_version,
        release_notes: release.body.unwrap_or_else(|| "No release notes provided.".into()),
        download_url,
        asset_name,
    })
}

pub async fn download_and_run_installer(
    app: AppHandle,
    download_url: String,
    filename: String,
) -> Result<(), String> {
    let client = reqwest::Client::builder()
        .user_agent("KitKat-Desktop-App")
        .build()
        .map_err(|e| e.to_string())?;

    let mut resp = client
        .get(&download_url)
        .send()
        .await
        .map_err(|e| format!("Download request failed: {e}"))?;

    if !resp.status().is_success() {
        return Err(format!("Download failed with HTTP {}", resp.status()));
    }

    let total_bytes = resp.content_length().unwrap_or(0);
    let target_dir = std::env::temp_dir().join("KitKat-Updates");
    let _ = tokio::fs::create_dir_all(&target_dir).await;
    let safe_filename = if filename.is_empty() {
        "KitKat-Setup.exe".to_string()
    } else {
        filename
    };
    let target_path = target_dir.join(&safe_filename);

    let mut file = tokio::fs::File::create(&target_path)
        .await
        .map_err(|e| format!("Failed to create update file: {e}"))?;

    let mut downloaded: u64 = 0;
    let mut last_percent = 0u8;

    use tokio::io::AsyncWriteExt;
    while let Some(chunk) = resp.chunk().await.map_err(|e| format!("Stream read error: {e}"))? {
        file.write_all(&chunk)
            .await
            .map_err(|e| format!("File write error: {e}"))?;
        downloaded += chunk.len() as u64;

        if total_bytes > 0 {
            let percent = ((downloaded as f64 / total_bytes as f64) * 100.0) as u8;
            if percent != last_percent {
                last_percent = percent;
                let _ = app.emit(
                    "update-download-progress",
                    UpdateProgress {
                        percent,
                        downloaded_bytes: downloaded,
                        total_bytes,
                    },
                );
            }
        }
    }
    file.flush().await.map_err(|e| format!("Flush error: {e}"))?;
    drop(file);

    launch_installer_and_exit(app, target_path)?;
    Ok(())
}

fn launch_installer_and_exit(app: AppHandle, installer_path: PathBuf) -> Result<(), String> {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        let mut cmd = std::process::Command::new(&installer_path);
        // CREATE_NEW_PROCESS_GROUP (0x00000200) | DETACHED_PROCESS (0x00000008)
        cmd.creation_flags(0x00000208);
        cmd.spawn().map_err(|e| format!("Failed to spawn installer: {e}"))?;
        app.exit(0);
        Ok(())
    }
    #[cfg(not(windows))]
    {
        let _ = installer_path;
        app.exit(0);
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_newer() {
        assert!(is_newer_version("0.1.0", "v0.1.1"));
        assert!(is_newer_version("0.1.0", "v0.2.0"));
        assert!(is_newer_version("0.1.0", "v1.0.0"));
        assert!(!is_newer_version("0.1.0", "0.1.0"));
        assert!(!is_newer_version("0.2.0", "v0.1.5"));
    }
}
