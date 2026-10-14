# In-App GitHub Releases Updater Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide automated and manual in-app update checks against GitHub Releases with real-time download progress and detached Windows installer execution.

**Architecture:** A Rust backend module `src-tauri/src/updater.rs` queries the public GitHub Releases API, compares semver versions, streams the installer binary to `%TEMP%` while emitting download progress events, and executes the installer in a detached process before exiting. The Settings UI and System Tray trigger and display the update flow.

**Tech Stack:** Tauri v2, Rust (`reqwest`, `tokio`, `serde`, `windows`), TypeScript, Vanilla CSS, Node test runner.

---

### Task 1: Semantic Version Comparison and Unit Tests

**Files:**
- Create: `tests/updater.test.mjs`

- [ ] **Step 1: Write test for semantic version comparison**

```javascript
import test from "node:test";
import assert from "node:assert/strict";

function isNewerVersion(current, latest) {
  const clean = (v) => v.replace(/^v/, "").trim();
  const cParts = clean(current).split(".").map(n => parseInt(n, 10) || 0);
  const lParts = clean(latest).split(".").map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const c = cParts[i] || 0;
    const l = lParts[i] || 0;
    if (l > c) return true;
    if (l < c) return false;
  }
  return false;
}

test("Version comparison: detects newer releases correctly", () => {
  assert.equal(isNewerVersion("0.1.0", "v0.1.1"), true);
  assert.equal(isNewerVersion("0.1.0", "v0.2.0"), true);
  assert.equal(isNewerVersion("0.1.0", "v1.0.0"), true);
  assert.equal(isNewerVersion("0.1.0", "0.1.0"), false);
  assert.equal(isNewerVersion("0.2.0", "v0.1.9"), false);
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `node --test tests/updater.test.mjs`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add tests/updater.test.mjs
git commit -m "test: add semantic version comparison unit tests"
```

---

### Task 2: Rust Updater Module (`src-tauri/src/updater.rs`)

**Files:**
- Create: `src-tauri/src/updater.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Create `src-tauri/src/updater.rs` with GitHub check and installer download**

```rust
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

pub fn is_newer_version(current: &str, latest: &str) -> bool {
    let clean = |v: &str| v.trim().trim_start_matches('v');
    let parse_parts = |v: &str| -> [u32; 3] {
        let mut parts = [0u32; 3];
        for (i, p) in clean(v).split('.').take(3).enumerate() {
            parts[i] = p.parse().unwrap_or(0);
        }
        parts
    };

    let c = parse_parts(current);
    let l = parse_parts(latest);

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
    let safe_filename = if filename.is_empty() { "KitKat-Setup.exe".to_string() } else { filename };
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

    // Launch installer in detached background process and exit KitKat
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
```

- [ ] **Step 2: Register updater module and IPC commands in `src-tauri/src/lib.rs`**

Add `pub mod updater;` and commands:
- `check_for_updates() -> Result<updater::UpdateInfo, String>`
- `download_and_install_update(app: AppHandle, download_url: String, filename: String) -> Result<(), String>`

- [ ] **Step 3: Run `cargo check` and `cargo test`**

Run: `cargo test --manifest-path src-tauri/Cargo.toml`
Expected: PASS (including `test_is_newer`)

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/updater.rs src-tauri/src/lib.rs
git commit -m "feat(updater): add GitHub releases updater backend and IPC commands"
```

---

### Task 3: System Tray Menu Update Action

**Files:**
- Modify: `src-tauri/src/tray.rs`

- [ ] **Step 1: Add "Check for Updates…" menu item to System Tray**

```rust
let update_item = MenuItem::with_id(app, "check_updates", "Check for Updates…", true, None::<&str>)?;
```
In menu click event handler:
```rust
"check_updates" => {
    crate::open_settings_window(app);
    if let Some(win) = app.get_webview_window("settings") {
        let _ = win.emit("trigger-update-check", ());
    }
}
```

- [ ] **Step 2: Verify `cargo check` compiles**

Run: `cargo check --manifest-path src-tauri/Cargo.toml`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/tray.rs
git commit -m "feat(tray): add check for updates option to tray menu"
```

---

### Task 4: Config & Settings UI for Updates

**Files:**
- Modify: `src/core/config.ts`
- Modify: `src/settings.ts`
- Modify: `src/settings.css`

- [ ] **Step 1: Add `autoCheckUpdates` to `AppConfig.island` in `src/core/config.ts`**

In `IslandConfigCustom`:
```typescript
autoCheckUpdates: boolean;
```
In `DEFAULT_CONFIG.island`:
```typescript
autoCheckUpdates: true,
```

- [ ] **Step 2: Add "App Updates & Version" Card in `src/settings.ts`**
- Show current version (`v0.1.0`), status pill, and "Check for Updates" button.
- When update available: render release version badge, formatted release notes, and "Update Now" button.
- Handle `update-download-progress` event to render a live progress bar (`%` and bytes).
- Listen to `trigger-update-check` from tray menu.

- [ ] **Step 3: Add CSS styles in `src/settings.css`**
- Style the update card, status badges, changelog box, and progress fill.

- [ ] **Step 4: Run `npm run build` and `npm test`**

Run: `npm run build && npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/config.ts src/settings.ts src/settings.css
git commit -m "feat(settings): add in-app updater card and progress UI"
```

---

### Task 5: End-to-End Verification

- [ ] **Step 1: Run all tests**
Run: `npm test` and `cargo test --manifest-path src-tauri/Cargo.toml`
Expected: ALL PASS

- [ ] **Step 2: Verify build**
Run: `npm run build`
Expected: Clean bundle output, 0 errors.
