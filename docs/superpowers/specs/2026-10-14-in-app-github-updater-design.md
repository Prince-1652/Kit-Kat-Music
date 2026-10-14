# In-App GitHub Releases Updater Design

## Overview
Adds automated GitHub release update checking and one-click in-app installer downloading/execution for KitKat Music.

## System Architecture

### 1. Rust Backend (`src-tauri/src/updater.rs`)
- **Release Source**: `https://api.github.com/repos/Prince-1652/Kit-Kat-Music/releases/latest`
- **Data Model**:
  ```rust
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
  ```
- **Version Parser**:
  - Compares semantic versioning (stripping leading `v`, parsing major.minor.patch).
  - Current version resolved at compile time via `env!("CARGO_PKG_VERSION")`.
- **Installer Streaming & Detached Launch**:
  - `download_and_install_update`:
    - Streams HTTP response chunks via `tokio::io::AsyncWriteExt`.
    - Throttles frontend IPC event emissions (`update-download-progress`) to avoid saturating WebView event loop.
    - Saves to `std::env::temp_dir().join(format!("KitKat-Update-{}.exe", latest_version))`.
    - Spawns installer process using Windows `CREATE_NEW_PROCESS_GROUP | DETACHED_PROCESS` flags.
    - Exits current app cleanly via `app.exit(0)`.

### 2. Integration with Main App (`src-tauri/src/lib.rs` & `src-tauri/src/tray.rs`)
- Register commands: `check_for_updates`, `download_and_install_update`.
- System Tray menu addition: "Check for Updates…" item that opens the Settings window and triggers update inspection.

### 3. Frontend UI (`src/settings.ts`, `src/settings.css`, `src/core/config.ts`)
- **Settings Card**: "KitKat Version & Updates"
  - Displays current version (`v0.1.0`), release tag, and status badge ("Up to date", "Checking...", "Update Available", "Downloading...").
  - "Check for Updates" trigger button.
  - "Update Now" action when an update is detected, including changelog preview.
  - Live animated download progress bar with percentage and byte counts.
- **Config**:
  - `island.autoCheckUpdates: boolean` (default: `true`).

## Verification Plan
1. Unit test version comparison logic in Rust.
2. `cargo check` and `cargo test` pass with 0 errors.
3. `npx tsc --noEmit` and `npm run build` pass with 0 errors.
4. `npm test` passes all tests.
