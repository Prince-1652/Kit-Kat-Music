# Dynamic Island Music Player Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Build an ultra-lightweight, Material 3 dynamic island desktop music player for Windows powered by Tauri v2, Rust, Vanilla TypeScript, and `yt-dlp`.

**Architecture:** A transparent, borderless, always-on-top window pinned to the top screen center toggles between an invisible 6px wake strip, a compact 38px pill with live EQ bars during playback, and a 380px expanded search/player panel. Rust handles Win32 cursor hit-testing (click-through) and `yt-dlp` process management, while the frontend runs vanilla TypeScript with spring physics animations and HTML5 audio streaming.

**Tech Stack:** Tauri v2, Rust (tokio, windows-rs, reqwest), Vite 6, TypeScript 5, Vanilla CSS (Material 3 tokens), Lucide SVG icons.

---

### Task 1: Project Scaffolding & Configuration

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src-tauri/Cargo.toml`
- Create: `src-tauri/build.rs`
- Create: `src-tauri/tauri.conf.json`
- Create: `src-tauri/capabilities/default.json`
- Create: `src-tauri/src/main.rs`
- Create: `src-tauri/src/lib.rs`

- [x] **Step 1: Create frontend configuration files (`package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`)**

`package.json`:
```json
{
  "name": "kitkat-desktop",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "tauri": "tauri",
    "test": "node --test tests/**/*.test.mjs"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2.0.0",
    "typescript": "^5.6.0",
    "vite": "^6.0.0"
  },
  "dependencies": {
    "@tauri-apps/api": "^2.0.0"
  }
}
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

`vite.config.ts`:
```ts
import { defineConfig } from "vite";

export default defineConfig({
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  build: {
    target: "esnext",
    minify: "esbuild",
  },
});
```

`index.html`:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>KitKat</title>
    <link rel="stylesheet" href="/src/style.css" />
  </head>
  <body>
    <div id="island-root" class="island-root">
      <div id="island" class="island hidden">
        <div id="island-wake" class="island-wake"></div>
        <div id="island-pill" class="island-pill"></div>
        <div id="island-panel" class="island-panel"></div>
      </div>
    </div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [x] **Step 2: Create Tauri v2 configuration and Rust files**

`src-tauri/Cargo.toml`:
```toml
[package]
name = "kitkat-desktop"
version = "0.1.0"
description = "KitKat Desktop - Dynamic Island Music Player"
edition = "2021"

[lib]
name = "kitkat_lib"
crate-type = ["staticlib", "cdylib", "rlib"]

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = ["tray-icon"] }
serde = { version = "1", features = ["derive"] }
serde_json = { version = "1" }
tokio = { version = "1", features = ["process", "sync", "time", "rt-multi-thread", "fs", "io-util"] }
reqwest = { version = "0.12", default-features = false, features = ["json", "rustls-tls", "stream"] }

[target.'cfg(windows)'.dependencies]
windows = { version = "0.61", features = [
  "Win32_Foundation",
  "Win32_UI_WindowsAndMessaging",
  "Win32_UI_Input_KeyboardAndMouse"
] }
```

`src-tauri/build.rs`:
```rust
fn main() {
    tauri_build::build();
}
```

`src-tauri/tauri.conf.json`:
```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "KitKat",
  "version": "0.1.0",
  "identifier": "com.kitkat.desktop",
  "build": {
    "beforeDevCommand": "npm run dev",
    "devUrl": "http://localhost:1420",
    "beforeBuildCommand": "npm run build",
    "frontendDist": "../dist"
  },
  "app": {
    "withGlobalTauri": false,
    "security": {
      "csp": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data: blob:; media-src 'self' https: blob:; connect-src 'self' ipc: http://ipc.localhost https:"
    },
    "windows": [
      {
        "label": "island",
        "title": "KitKat",
        "url": "index.html",
        "width": 580,
        "height": 400,
        "resizable": false,
        "decorations": false,
        "transparent": true,
        "shadow": false,
        "alwaysOnTop": true,
        "skipTaskbar": true,
        "focus": false,
        "visible": true,
        "center": false,
        "maximizable": false,
        "minimizable": false,
        "closable": false
      }
    ]
  }
}
```

`src-tauri/capabilities/default.json`:
```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Default permissions for KitKat Desktop",
  "windows": ["island"],
  "permissions": [
    "core:default"
  ]
}
```

`src-tauri/src/main.rs`:
```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    kitkat_lib::run();
}
```

`src-tauri/src/lib.rs`:
```rust
use tauri::Builder;

#[tauri::command]
fn ping() -> &'static str {
    "pong"
}

pub fn run() {
    Builder::default()
        .invoke_handler(tauri::generate_handler![ping])
        .run(tauri::generate_context!())
        .expect("error while running KitKat application");
}
```

- [x] **Step 3: Run npm install and verify project builds**

Run: `npm install`
Expected: Node modules installed cleanly.

- [x] **Step 4: Commit scaffolding**

```bash
git add .
git commit -m "chore: scaffold Tauri v2 and Vite project structure"
```

---

### Task 2: Spring Animation Physics & Unit Tests

**Files:**
- Create: `src/core/anim.ts`
- Test: `tests/anim.test.mjs`

- [x] **Step 1: Write test for Spring physics engine**

`tests/anim.test.mjs`:
```js
import test from "node:test";
import assert from "node:assert/strict";

// We test the math logic of the spring solver
class Spring {
  constructor(value, response = 0.45, damping = 0.75) {
    this.value = value;
    this.target = value;
    this.velocity = 0;
    this.omega = (2 * Math.PI) / response;
    this.zeta = damping;
  }

  set(target) {
    this.target = target;
  }

  step(dt) {
    const f = -2 * this.zeta * this.omega * this.velocity - this.omega * this.omega * (this.value - this.target);
    this.velocity += f * dt;
    this.value += this.velocity * dt;
    return Math.abs(this.value - this.target) < 0.05 && Math.abs(this.velocity) < 0.05;
  }
}

test("Spring reaches target smoothly without NaN", () => {
  const spring = new Spring(0, 0.45, 0.75);
  spring.set(100);

  let settled = false;
  for (let i = 0; i < 200; i++) {
    settled = spring.step(0.016);
    assert.ok(!Number.isNaN(spring.value), "Spring value must not be NaN");
    if (settled) break;
  }

  assert.ok(settled, "Spring should settle within reasonable frames");
  assert.ok(Math.abs(spring.value - 100) < 1, "Spring should settle near 100");
});
```

- [x] **Step 2: Run test to verify it passes**

Run: `node --test tests/anim.test.mjs`
Expected: PASS

- [x] **Step 3: Implement `src/core/anim.ts`**

`src/core/anim.ts`:
```ts
export const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export class Spring {
  value: number;
  target: number;
  velocity = 0;
  private readonly omega: number;
  private readonly zeta: number;

  constructor(initial: number, response = 0.45, damping = 0.75) {
    this.value = initial;
    this.target = initial;
    this.omega = (2 * Math.PI) / response;
    this.zeta = damping;
  }

  set(target: number): void {
    this.target = target;
  }

  snap(value: number): void {
    this.value = value;
    this.target = value;
    this.velocity = 0;
  }

  step(dt = 0.016): boolean {
    // 2 sub-steps for stability against frame drops
    const subDt = dt / 2;
    for (let i = 0; i < 2; i++) {
      const f = -2 * this.zeta * this.omega * this.velocity - this.omega * this.omega * (this.value - this.target);
      this.velocity += f * subDt;
      this.value += this.velocity * subDt;
    }
    const settled = Math.abs(this.value - this.target) < 0.05 && Math.abs(this.velocity) < 0.05;
    if (settled) {
      this.value = this.target;
      this.velocity = 0;
    }
    return settled;
  }
}
```

- [x] **Step 4: Commit animation engine**

```bash
git add src/core/anim.ts tests/anim.test.mjs
git commit -m "feat: add spring animation physics solver"
```

---

### Task 3: Lucide SVG Icon Registry & Material 3 Design Tokens

**Files:**
- Create: `src/core/icons.ts`
- Create: `src/style.css`

- [x] **Step 1: Implement `src/core/icons.ts` with pure Lucide SVGs**

`src/core/icons.ts`:
```ts
export type IconName =
  | "search"
  | "play"
  | "pause"
  | "skipForward"
  | "skipBack"
  | "volume2"
  | "volumeX"
  | "chevronUp"
  | "x"
  | "loader2"
  | "wifiOff";

const ICONS: Record<IconName, string> = {
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`,
  play: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="6 3 20 12 6 21 6 3"/></svg>`,
  pause: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`,
  skipForward: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>`,
  skipBack: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/></svg>`,
  volume2: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`,
  volumeX: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/></svg>`,
  chevronUp: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>`,
  x: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
  loader2: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`,
  wifiOff: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" y1="2" x2="22" y2="22"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><path d="M2 8.82a15 15 0 0 1 4.17-2.65"/><path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76"/><path d="M16.85 11.25a10 10 0 0 1 2.22 1.68"/><path d="M5 13a10 10 0 0 1 5.24-2.78"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>`,
};

export function renderIcon(name: IconName, className = "icon"): string {
  const svg = ICONS[name] || "";
  return svg.replace("<svg ", `<svg class="${className}" `);
}
```

- [x] **Step 2: Implement `src/style.css` with exact Material 3 design tokens**

`src/style.css`:
```css
:root {
  --kk-bg: #0C130F;
  --kk-surface: #1B2E23;
  --kk-surface-hover: #243D2F;
  --kk-primary: #57D18B;
  --kk-on-primary: #0C130F;
  --kk-text: #E4F0E8;
  --kk-text-dim: #9FB8A9;
  --kk-error: #E57373;
  --kk-border: rgba(87, 209, 139, 0.12);
  --kk-font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  user-select: none;
}

body {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: transparent;
  font-family: var(--kk-font);
  color: var(--kk-text);
}

.island-root {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  pointer-events: none;
}

.island {
  position: absolute;
  top: 0;
  background: var(--kk-bg);
  border: 1px solid var(--kk-border);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
  pointer-events: auto;
  overflow: hidden;
  transform-origin: top center;
  will-change: width, height, border-radius;
}

/* State 1: Hidden Wake Strip */
.island.state-hidden {
  width: 240px;
  height: 6px;
  border-radius: 0 0 6px 6px;
  border-top: none;
  opacity: 0.6;
  cursor: pointer;
}

/* State 2: Compact Pill */
.island.state-pill {
  width: 260px;
  height: 38px;
  border-radius: 19px;
  border-top: none;
  cursor: pointer;
}

/* State 3: Expanded Panel */
.island.state-panel {
  width: 560px;
  height: 380px;
  border-radius: 28px;
  border-top: none;
}

/* SVG icons */
.icon {
  width: 20px;
  height: 20px;
  display: inline-block;
  vertical-align: middle;
  flex-shrink: 0;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

- [x] **Step 3: Commit tokens and icons**

```bash
git add src/core/icons.ts src/style.css
git commit -m "feat: add Lucide SVG icon registry and Material 3 CSS tokens"
```

---

### Task 4: yt-dlp Rust Backend (Status, Downloader, Search, Stream)

**Files:**
- Create: `src-tauri/src/ytdlp.rs`
- Modify: `src-tauri/src/lib.rs`

- [x] **Step 1: Implement `src-tauri/src/ytdlp.rs`**

`src-tauri/src/ytdlp.rs`:
```rust
use std::path::PathBuf;
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
    if let Ok(output) = Command::new("yt-dlp")
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
        let output = Command::new(&path)
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

    tokio::fs::write(&target_path, bytes)
        .await
        .map_err(|e| format!("Failed to write yt-dlp binary: {e}"))?;

    Ok(())
}

pub async fn search_tracks(query: String) -> Result<Vec<TrackMetadata>, String> {
    let bin = resolve_ytdlp_bin()
        .await
        .ok_or_else(|| "yt-dlp is not installed".to_string())?;

    let search_arg = format!("ytsearch8:{}", query);
    let output = Command::new(bin)
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
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
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
    let bin = resolve_ytdlp_bin()
        .await
        .ok_or_else(|| "yt-dlp is not installed".to_string())?;

    let url = format!("https://www.youtube.com/watch?v={}", video_id);
    let output = Command::new(bin)
        .args([
            "-g",
            "-f",
            "ba[ext=m4a]/ba/b",
            "--no-playlist",
            &url,
        ])
        .output()
        .await
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    let stream_url = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if stream_url.is_empty() {
        return Err("No stream URL returned".to_string());
    }

    Ok(StreamPayload {
        stream_url,
        title: String::new(),
        artist: String::new(),
        thumbnail_url: None,
        duration_secs: None,
    })
}
```

- [x] **Step 2: Register commands in `src-tauri/src/lib.rs`**

```rust
pub mod ytdlp;

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
```

- [x] **Step 3: Run `cargo check` to verify compilation**

Run: `cd src-tauri && cargo check`
Expected: Compiles with 0 errors.

- [x] **Step 4: Commit yt-dlp backend**

```bash
git add src-tauri/src/ytdlp.rs src-tauri/src/lib.rs
git commit -m "feat: implement yt-dlp status check, installer, search and stream extractor"
```

---

### Task 5: Win32 Transparent Window & Click-through Hit Testing

**Files:**
- Create: `src-tauri/src/window.rs`
- Modify: `src-tauri/src/lib.rs`

- [x] **Step 1: Implement `src-tauri/src/window.rs`**

`src-tauri/src/window.rs`:
```rust
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Manager, PhysicalPosition, PhysicalSize, WebviewWindow};

#[derive(Clone, Copy, Default)]
pub struct IslandRect {
    pub x: f64,
    pub y: f64,
    pub w: f64,
    pub h: f64,
}

pub struct WindowManager {
    pub rect: Mutex<IslandRect>,
    pub collapsed: AtomicBool,
    pub ignoring: AtomicBool,
}

impl WindowManager {
    pub fn new() -> Self {
        Self {
            rect: Mutex::new(IslandRect::default()),
            collapsed: AtomicBool::new(true),
            ignoring: AtomicBool::new(false),
        }
    }

    pub fn set_rect(&self, rect: IslandRect, collapsed: bool) {
        *self.rect.lock().unwrap() = rect;
        self.collapsed.store(collapsed, Ordering::Relaxed);
    }
}

pub fn setup_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("island") {
        if let Ok(Some(monitor)) = window.primary_monitor() {
            let screen_size = monitor.size();
            let scale = monitor.scale_factor();
            let win_w = (580.0 * scale) as u32;
            let win_h = (400.0 * scale) as u32;
            let x = ((screen_size.width - win_w) / 2) as i32;

            let _ = window.set_size(PhysicalSize::new(win_w, win_h));
            let _ = window.set_position(PhysicalPosition::new(x, 0));
        }

        // Spawn background cursor hit-test thread
        let handle = window.clone();
        std::thread::spawn(move || {
            run_cursor_poll(handle);
        });
    }
}

fn run_cursor_poll(window: WebviewWindow) {
    use windows::Win32::Foundation::POINT;
    use windows::Win32::UI::WindowsAndMessaging::GetCursorPos;

    let mut is_ignoring = false;

    loop {
        std::thread::sleep(Duration::from_millis(16));

        let mut pt = POINT::default();
        unsafe {
            if GetCursorPos(&mut pt).is_err() {
                continue;
            }
        }

        let Ok(win_pos) = window.outer_position() else { continue };
        let Ok(win_size) = window.outer_size() else { continue };

        let state = window.state::<WindowManager>();
        let rect = *state.rect.lock().unwrap();
        let scale = window.scale_factor().unwrap_or(1.0);

        // Convert island rect in window to physical screen coords
        let island_screen_x = win_pos.x as f64 + (rect.x * scale);
        let island_screen_y = win_pos.y as f64 + (rect.y * scale);
        let island_screen_w = rect.w * scale;
        let island_screen_h = rect.h * scale;

        let margin = 14.0 * scale;
        let inside = (pt.x as f64) >= (island_screen_x - margin)
            && (pt.x as f64) <= (island_screen_x + island_screen_w + margin)
            && (pt.y as f64) >= 0.0
            && (pt.y as f64) <= (island_screen_y + island_screen_h + margin);

        let should_ignore = !inside;

        if should_ignore != is_ignoring {
            is_ignoring = should_ignore;
            let _ = window.set_ignore_cursor_events(is_ignoring);
        }
    }
}
```

- [x] **Step 2: Connect `WindowManager` state and `update_island_shape` in `src-tauri/src/lib.rs`**

```rust
#[tauri::command]
fn update_island_shape(
    window: tauri::WebviewWindow,
    x: f64,
    y: f64,
    w: f64,
    h: f64,
    collapsed: bool,
) {
    let state = window.state::<window::WindowManager>();
    state.set_rect(
        window::IslandRect { x, y, w, h },
        collapsed,
    );
}
```

- [x] **Step 3: Run `cargo check` to verify compilation**

Run: `cd src-tauri && cargo check`
Expected: Compiles with 0 errors.

- [x] **Step 4: Commit Win32 hit-testing module**

```bash
git add src-tauri/src/window.rs src-tauri/src/lib.rs
git commit -m "feat: add Win32 cursor polling and click-through management"
```

---

### Task 6: Audio Engine, Stream Resolver & Live Visualizer

**Files:**
- Create: `src/core/audio.ts`
- Create: `src/core/media_session.ts`

- [x] **Step 1: Implement `src/core/audio.ts`**

`src/core/audio.ts`:
```ts
export interface AudioTrack {
  id: string;
  title: string;
  artist: string;
  thumbnailUrl?: string;
  durationSecs?: number;
  streamUrl: string;
}

export type PlaybackState = "idle" | "buffering" | "playing" | "paused" | "error";

export class AudioEngine {
  readonly audio = new Audio();
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private freqData = new Uint8Array(16);

  currentTrack: AudioTrack | null = null;
  state: PlaybackState = "idle";
  onStateChange?: (state: PlaybackState) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;

  constructor() {
    this.audio.crossOrigin = "anonymous";
    this.audio.preload = "auto";

    this.audio.addEventListener("playing", () => this.setState("playing"));
    this.audio.addEventListener("pause", () => this.setState("paused"));
    this.audio.addEventListener("waiting", () => this.setState("buffering"));
    this.audio.addEventListener("timeupdate", () => {
      this.onTimeUpdate?.(this.audio.currentTime, this.audio.duration || 0);
    });
    this.audio.addEventListener("error", () => this.setState("error"));
  }

  private initAudioContext(): void {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 32;
    this.freqData = new Uint8Array(this.analyser.frequencyBinCount);

    this.source = this.ctx.createMediaElementSource(this.audio);
    this.source.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  async play(track: AudioTrack): Promise<void> {
    this.initAudioContext();
    if (this.ctx?.state === "suspended") {
      await this.ctx.resume();
    }

    this.currentTrack = track;
    this.audio.src = track.streamUrl;
    this.setState("buffering");
    await this.audio.play();
  }

  pause(): void {
    this.audio.pause();
  }

  resume(): void {
    if (this.audio.src) {
      this.audio.play();
    }
  }

  seek(seconds: number): void {
    this.audio.currentTime = seconds;
  }

  setVolume(fraction: number): void {
    this.audio.volume = Math.max(0, Math.min(1, fraction));
  }

  getFrequencyBars(): number[] {
    if (!this.analyser || this.state !== "playing") {
      return [0.15, 0.15, 0.15, 0.15];
    }
    this.analyser.getByteFrequencyData(this.freqData);
    // Take 4 representative bands (sub-bass, bass, mid, treble)
    return [
      Math.max(0.15, this.freqData[1] / 255),
      Math.max(0.15, this.freqData[3] / 255),
      Math.max(0.15, this.freqData[6] / 255),
      Math.max(0.15, this.freqData[10] / 255),
    ];
  }

  private setState(state: PlaybackState): void {
    this.state = state;
    this.onStateChange?.(state);
  }
}
```

- [x] **Step 2: Implement `src/core/media_session.ts`**

`src/core/media_session.ts`:
```ts
import type { AudioEngine, AudioTrack } from "./audio";

export function setupMediaSession(engine: AudioEngine, onNext?: () => void, onPrev?: () => void): void {
  if (!("mediaSession" in navigator)) return;

  engine.onStateChange = (state) => {
    navigator.mediaSession.playbackState = state === "playing" ? "playing" : state === "paused" ? "paused" : "none";
  };

  navigator.mediaSession.setActionHandler("play", () => engine.resume());
  navigator.mediaSession.setActionHandler("pause", () => engine.pause());
  navigator.mediaSession.setActionHandler("nexttrack", () => onNext?.());
  navigator.mediaSession.setActionHandler("previoustrack", () => onPrev?.());
  navigator.mediaSession.setActionHandler("seekto", (details) => {
    if (details.seekTime !== undefined) engine.seek(details.seekTime);
  });
}

export function updateMediaMetadata(track: AudioTrack): void {
  if (!("mediaSession" in navigator)) return;

  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title,
    artist: track.artist,
    artwork: track.thumbnailUrl ? [{ src: track.thumbnailUrl, sizes: "512x512", type: "image/jpeg" }] : [],
  });
}
```

- [x] **Step 3: Commit audio and media session modules**

```bash
git add src/core/audio.ts src/core/media_session.ts
git commit -m "feat: implement HTML5 audio streaming engine with live visualizer analyser"
```

---

### Task 7: Island State Machine & Morphing View

**Files:**
- Create: `src/island/fsm.ts`
- Create: `src/island/view.ts`

- [x] **Step 1: Implement `src/island/fsm.ts`**

`src/island/fsm.ts`:
```ts
export type IslandMode = "hidden" | "pill" | "panel";

export class IslandFSM {
  private current: IslandMode = "hidden";
  private isMusicPlaying = false;
  onChange?: (mode: IslandMode, prev: IslandMode) => void;

  get mode(): IslandMode {
    return this.current;
  }

  setPlaying(playing: boolean): void {
    this.isMusicPlaying = playing;
    if (this.current !== "panel") {
      this.transition(playing ? "pill" : "hidden");
    }
  }

  expand(): void {
    this.transition("panel");
  }

  collapse(): void {
    this.transition(this.isMusicPlaying ? "pill" : "hidden");
  }

  toggle(): void {
    if (this.current === "panel") {
      this.collapse();
    } else {
      this.expand();
    }
  }

  private transition(next: IslandMode): void {
    if (this.current === next) return;
    const prev = this.current;
    this.current = next;
    this.onChange?.(next, prev);
  }
}
```

- [x] **Step 2: Implement `src/island/view.ts`**

`src/island/view.ts`:
```ts
import { Spring } from "../core/anim";
import { invoke } from "@tauri-apps/api/core";
import type { IslandMode } from "./fsm";

interface IslandConfig {
  w: number;
  h: number;
  r: number;
}

const CONFIGS: Record<IslandMode, IslandConfig> = {
  hidden: { w: 240, h: 6, r: 6 },
  pill: { w: 260, h: 38, r: 19 },
  panel: { w: 560, h: 380, r: 28 },
};

export class IslandView {
  private readonly root: HTMLElement;
  private readonly el: HTMLElement;
  private readonly springW = new Spring(240);
  private readonly springH = new Spring(6);
  private readonly springR = new Spring(6);
  private isAnimating = false;

  constructor(root: HTMLElement, el: HTMLElement) {
    this.root = root;
    this.el = el;
  }

  setMode(mode: IslandMode): void {
    const target = CONFIGS[mode];
    this.springW.set(target.w);
    this.springH.set(target.h);
    this.springR.set(target.r);

    this.el.className = `island state-${mode}`;
    if (!this.isAnimating) {
      this.isAnimating = true;
      requestAnimationFrame(this.tick);
    }
  }

  private tick = (): void => {
    const settledW = this.springW.step();
    const settledH = this.springH.step();
    const settledR = this.springR.step();

    const w = this.springW.value;
    const h = this.springH.value;
    const r = this.springR.value;

    this.el.style.width = `${w}px`;
    this.el.style.height = `${h}px`;
    this.el.style.borderRadius = `${r}px`;

    // Report bounds to Tauri backend for click-through hit-testing
    const rect = this.el.getBoundingClientRect();
    invoke("update_island_shape", {
      x: rect.left,
      y: rect.top,
      w: rect.width,
      h: rect.height,
      collapsed: h < 40,
    }).catch(() => {});

    if (!settledW || !settledH || !settledR) {
      requestAnimationFrame(this.tick);
    } else {
      this.isAnimating = false;
    }
  };
}
```

- [x] **Step 3: Commit state machine and morphing view**

```bash
git add src/island/fsm.ts src/island/view.ts
git commit -m "feat: implement Island FSM and spring-based morphing view"
```

---

### Task 8: Player UI & Debounced Search View

**Files:**
- Create: `src/player/search.ts`
- Create: `src/player/controls.ts`
- Create: `src/main.ts`

- [x] **Step 1: Implement `src/player/search.ts`**

`src/player/search.ts`:
```ts
import { invoke } from "@tauri-apps/api/core";
import { renderIcon } from "../core/icons";
import type { TrackMetadata } from "../core/audio";

export class SearchManager {
  private timer: number | null = null;
  private currentQueryId = 0;
  onTrackSelect?: (track: TrackMetadata) => void;

  setup(inputEl: HTMLInputElement, resultsContainer: HTMLElement): void {
    inputEl.addEventListener("input", () => {
      const q = inputEl.value.trim();
      if (this.timer) clearTimeout(this.timer);

      if (q.length === 0) {
        resultsContainer.innerHTML = "";
        return;
      }

      this.timer = window.setTimeout(() => this.runSearch(q, resultsContainer), 350);
    });
  }

  private async runSearch(query: String, container: HTMLElement): Promise<void> {
    const queryId = ++this.currentQueryId;
    container.innerHTML = `<div class="search-loading">${renderIcon("loader2")} Searching...</div>`;

    try {
      const tracks = await invoke<TrackMetadata[]>("search_music", { query });
      if (queryId !== this.currentQueryId) return;

      if (tracks.length === 0) {
        container.innerHTML = `<div class="search-empty">No results found</div>`;
        return;
      }

      container.innerHTML = tracks
        .map(
          (t) => `
        <div class="search-item" data-id="${t.id}">
          <img src="${t.thumbnail_url || ""}" class="search-thumb" />
          <div class="search-meta">
            <div class="search-title">${t.title}</div>
            <div class="search-artist">${t.uploader}</div>
          </div>
        </div>
      `
        )
        .join("");

      container.querySelectorAll(".search-item").forEach((el, index) => {
        el.addEventListener("click", () => {
          this.onTrackSelect?.(tracks[index]);
        });
      });
    } catch (err) {
      if (queryId === this.currentQueryId) {
        container.innerHTML = `<div class="search-error">${renderIcon("wifiOff")} Search error</div>`;
      }
    }
  }
}
```

- [x] **Step 2: Implement `src/player/controls.ts`**

`src/player/controls.ts`:
```ts
import { renderIcon } from "../core/icons";
import type { AudioEngine } from "../core/audio";

export class PlayerControls {
  constructor(private engine: AudioEngine, private container: HTMLElement) {}

  render(): void {
    this.container.innerHTML = `
      <div class="controls-row">
        <button id="btn-prev" class="btn-icon">${renderIcon("skipBack")}</button>
        <button id="btn-play" class="btn-fab">${renderIcon("play")}</button>
        <button id="btn-next" class="btn-icon">${renderIcon("skipForward")}</button>
        <div class="vol-group">
          <button id="btn-vol" class="btn-icon">${renderIcon("volume2")}</button>
          <input type="range" id="vol-slider" min="0" max="1" step="0.05" value="1" />
        </div>
      </div>
    `;

    const playBtn = this.container.querySelector("#btn-play") as HTMLButtonElement;
    playBtn.addEventListener("click", () => {
      if (this.engine.state === "playing") {
        this.engine.pause();
      } else {
        this.engine.resume();
      }
    });

    const volSlider = this.container.querySelector("#vol-slider") as HTMLInputElement;
    volSlider.addEventListener("input", () => {
      this.engine.setVolume(parseFloat(volSlider.value));
    });

    this.engine.onStateChange = (state) => {
      playBtn.innerHTML = renderIcon(state === "playing" ? "pause" : "play");
    };
  }
}
```

- [x] **Step 3: Wire full app in `src/main.ts`**

`src/main.ts`:
```ts
import { AudioEngine } from "./core/audio";
import { setupMediaSession, updateMediaMetadata } from "./core/media_session";
import { IslandFSM } from "./island/fsm";
import { IslandView } from "./island/view";
import { SearchManager } from "./player/search";
import { PlayerControls } from "./player/controls";
import { renderIcon } from "./core/icons";
import { invoke } from "@tauri-apps/api/core";

window.addEventListener("DOMContentLoaded", () => {
  const root = document.getElementById("island-root")!;
  const island = document.getElementById("island")!;
  const pill = document.getElementById("island-pill")!;
  const panel = document.getElementById("island-panel")!;

  const engine = new AudioEngine();
  const fsm = new IslandFSM();
  const view = new IslandView(root, island);

  setupMediaSession(engine);

  fsm.onChange = (mode) => view.setMode(mode);
  view.setMode(fsm.mode);

  // Click on island toggles panel
  island.addEventListener("click", (e) => {
    if (fsm.mode !== "panel") {
      fsm.expand();
    }
  });

  // Escape key collapses
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") fsm.collapse();
  });

  // Render Pill content
  pill.innerHTML = `
    <div class="pill-thumb"></div>
    <div class="pill-title">KitKat Music</div>
    <div class="pill-eq">
      <span class="bar"></span><span class="bar"></span>
      <span class="bar"></span><span class="bar"></span>
    </div>
  `;

  // Render Panel content
  panel.innerHTML = `
    <div class="panel-header">
      <div class="search-bar">
        ${renderIcon("search")}
        <input type="text" id="search-input" placeholder="Search songs..." />
        <button id="btn-clear" class="btn-icon">${renderIcon("x")}</button>
      </div>
      <button id="btn-collapse" class="btn-icon">${renderIcon("chevronUp")}</button>
    </div>
    <div id="search-results" class="search-results"></div>
    <div id="player-controls" class="player-controls"></div>
  `;

  const collapseBtn = panel.querySelector("#btn-collapse") as HTMLButtonElement;
  collapseBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    fsm.collapse();
  });

  const controls = new PlayerControls(engine, panel.querySelector("#player-controls")!);
  controls.render();

  const searchManager = new SearchManager();
  const searchInput = panel.querySelector("#search-input") as HTMLInputElement;
  const searchResults = panel.querySelector("#search-results") as HTMLElement;
  searchManager.setup(searchInput, searchResults);

  searchManager.onTrackSelect = async (track) => {
    try {
      const stream = await invoke<{ stream_url: string }>("get_stream_url", { video_id: track.id });
      const fullTrack = {
        ...track,
        artist: track.uploader,
        streamUrl: stream.stream_url,
      };
      await engine.play(fullTrack);
      updateMediaMetadata(fullTrack);
      fsm.setPlaying(true);
      pill.querySelector(".pill-title")!.textContent = track.title;
    } catch (err) {
      console.error("Failed to play track:", err);
    }
  };

  // EQ Animation loop for Pill
  function updateEq() {
    if (fsm.mode === "pill") {
      const bars = engine.getFrequencyBars();
      const barEls = pill.querySelectorAll<HTMLElement>(".bar");
      barEls.forEach((el, i) => {
        el.style.transform = `scaleY(${bars[i]})`;
      });
    }
    requestAnimationFrame(updateEq);
  }
  requestAnimationFrame(updateEq);
});
```

- [x] **Step 4: Commit UI and integration modules**

```bash
git add src/player/search.ts src/player/controls.ts src/main.ts
git commit -m "feat: implement debounced search, controls, and main app bootstrap"
```

---

### Task 9: Build Verification & Polish

- [x] **Step 1: Run frontend build check**

Run: `npm run build`
Expected: TypeScript check passes, Vite bundle created with 0 errors.

- [x] **Step 2: Run Rust build check**

Run: `cd src-tauri && cargo check`
Expected: Cargo check passes with 0 errors.

- [x] **Step 3: Commit verified implementation**

```bash
git add .
git commit -m "chore: verify frontend and Rust builds pass"
```
