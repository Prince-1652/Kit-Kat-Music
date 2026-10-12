# KitKat Desktop — Dynamic Island Music Player Design Document

**Status:** In Progress (Brainstorming / Design Phase)  
**Date:** 2026-10-12  
**Target:** Windows (Tauri v2 + Rust + Vanilla TypeScript + CSS)

---

## 1. Overview & Goals

* **Goal:** Ultra-lightweight desktop music player running as a dynamic island at top of screen.
* **Aesthetics:** Material 3 Dark theme (matching Android KitKat palette: `#0C130F`, `#1B2E23`, `#57D18B`), Lucide SVG rounded icons (no emojis), smooth physics-based morph animations (Coucou-style spring solver).
* **Behavior:**
  * Idle: Hidden as 6px wake strip at top-center. Clicks pass through to background apps.
  * Playing: Compact pill (`~240x36px`) showing animated mini EQ visualizer bars, track title, and thumbnail.
  * Expanded: Clicking the island smoothly expands downward (`~560x360px`) to reveal search bar, search results, full player controls, scrubber, and volume slider.
* **Audio Backend:** YouTube audio streaming via `yt-dlp`. Stream URL fed into HTML5 `<audio>` element with Web Audio API visualizer and `navigator.mediaSession` integration.

---

## 2. Architecture & IPC Flow (APPROVED)

```
┌────────────────────────────────────────────────────────┐
│                      Tauri v2                          │
│                                                        │
│  ┌───────────────────────┐    IPC (Tauri invoke)       │
│  │     Rust Backend      │ ◄───────────────────────┐   │
│  │  - Window hit-test    │                         │   │
│  │  - Click-through Win32│                         │   │
│  │  - yt-dlp manager     │                         │   │
│  │    (search/stream URL)│                         │   │
│  │  - Auto-downloader    │                         │   │
│  └──────────┬────────────┘                         │   │
│             │ (Process spawn)                      │   │
│             ▼                                      │   │
│         [ yt-dlp ]                                 │   │
│                                                    │   │
│  ┌──────────────────────────────────────────────┐  │   │
│  │       Frontend (Vanilla TS + CSS)            │──┘   │
│  │  - Island state machine (Hidden/Pill/Panel)  │      │
│  │  - Spring physics layout morph               │      │
│  │  - HTML5 <audio> streaming engine            │      │
│  │  - Audio visualizer (Web Audio Analyser)     │      │
│  │  - MediaSession API (Hardware keyboard keys) │      │
│  └──────────────────────────────────────────────┘      │
└────────────────────────────────────────────────────────┘
```

### IPC Commands (Rust `src-tauri/`)
1. `get_yt_dlp_status() -> Result<YtDlpStatus, String>`
   * Checks system `PATH` and local data directory `%LOCALAPPDATA%/Kitkat/bin/yt-dlp.exe`.
   * Returns `{ installed: bool, path: Option<String>, version: Option<String> }`.
2. `install_yt_dlp() -> Result<(), String>`
   * Auto-downloads latest standalone `yt-dlp.exe` from GitHub official releases into app local data folder if missing. Emits download progress events.
3. `search_music(query: String) -> Result<Vec<TrackMetadata>, String>`
   * Executes: `yt-dlp --dump-single-json --flat-playlist "ytsearch8:<query>"`.
   * Returns list of items: `id`, `title`, `uploader`, `duration_secs`, `thumbnail_url`.
4. `get_stream_url(video_id: String) -> Result<StreamPayload, String>`
   * Executes: `yt-dlp -g -f "ba[ext=m4a]/ba/b" --no-playlist "https://youtube.com/watch?v=<id>"`.
   * Returns direct audio URL and expiry timestamp.
5. `update_island_shape(x: f64, y: f64, w: f64, h: f64, collapsed: bool)`
   * Sends current island geometry to Rust cursor poll thread.
   * Manages Win32 window click-through (`set_ignore_cursor_events`) so transparent margins pass clicks to windows below.

### Frontend Audio & Animation Pipeline
* **Audio Engine:** HTML5 `<audio>` element with CORS enabled.
* **Live Visualizer:** `AudioContext` -> `createMediaElementSource(audio)` -> `AnalyserNode` -> 4 animated mini EQ bars in compact pill.
* **System Integration:** `navigator.mediaSession` set with title, artist, artwork, and action handlers for hardware Play/Pause/Prev/Next media keys.

---

## 3. UI/UX, Dimensions, Animations & Material 3 Design System (APPROVED)

### 3.1 Color Tokens (KitKat Android M3 Spec)
* `bg`: `#0C130F` (Window canvas, base surface & island body)
* `surface`: `#1B2E23` (Search bar, card containers, list items, slider inactive track)
* `primary`: `#57D18B` (Play FAB, active slider progress, animated EQ bars, focus rings)
* `text`: `#E4F0E8` (Titles, primary text, high emphasis)
* `text-dim`: `#9FB8A9` (Artists, durations, placeholders, hints)
* `error`: `#E57373` (Network failure, stream error notifications)

### 3.2 Icon Family (Lucide SVGs — zero emojis)
* Search & Navigation: `Search`, `X`, `ChevronUp` (collapse button)
* Playback: `Play`, `Pause`, `SkipForward`, `SkipBack`
* Audio: `Volume2`, `VolumeX`
* Status / System: `Loader2` (animated spinner), `WifiOff` (offline badge)

### 3.3 Three Island States & Dimensions
```
[ State 1: Hidden (Idle) ]
  Width: 240px, Height: 6px
  Top-center invisible strip. Click-through active. 0% CPU.

              ▼ Click / Mouse Enter (when active) / Music Playing

[ State 2: Compact Pill (Playing) ]
  Width: 260px, Height: 38px, Radius: 19px
  ┌──────────────────────────────────────────────────┐
  │ [● Thumb]  Track Title - Artist   [ ılı EQ Bars] │
  └──────────────────────────────────────────────────┘
  Hover: Quick Play/Pause icon overlay.
  Click: Expands to State 3.

              ▼ Click Pill / Click Wake Strip

[ State 3: Expanded Panel (Search + Player) ]
  Width: 560px, Height: 380px, Radius: 28px (Material 3 XL Shape)
  ┌────────────────────────────────────────────────────────┐
  │  [🔍 Search songs, artists...                     (✕)]  │
  ├────────────────────────────────────────────────────────┤
  │  ┌──────────┐  Song Title                              │
  │  │ Artwork  │  Artist Name                             │
  │  │ 120x120  │  01:23 ━━━━━━●────────────── 03:45       │
  │  └──────────┘                                          │
  │  (Or Search Results list when query typed)             │
  ├────────────────────────────────────────────────────────┤
  │   [⏮]     [ ▶ PLAY FAB ]     [⏭]    🔊 [━━●━━━]  [▲]  │
  └────────────────────────────────────────────────────────┘
```

### 3.4 Animation Physics
* Spring engine matching Coucou (`Spring` class in TS with `response: 0.45`, `dampingFraction: 0.75`).
* Pill ↔ Panel transitions morph `width`, `height`, `border-radius`, and opacity simultaneously via `requestAnimationFrame`.
* Smooth EQ bars: 4 vertical bars updating from Web Audio `AnalyserNode.getByteFrequencyData()`.

---

## 4. Edge Cases, Crash Prevention & Reliability (APPROVED)

### 4.1 `yt-dlp` Edge Cases
* **Missing binary on first run:** App detects no `yt-dlp` → shows download progress spinner inside panel → downloads latest standalone `yt-dlp.exe` from official GitHub release into `%LOCALAPPDATA%/Kitkat/bin/`.
* **Outdated binary / YouTube 403:** If stream extraction fails with YouTube signature error → trigger background `yt-dlp -U` auto-update + retry.
* **Search cancellation / typing race:** When user types new character in search bar → abort previous running search process in Rust immediately. Query sequence ID prevents old results overwriting new ones.

### 4.2 Audio & Network Edge Cases
* **Expired stream URLs:** YouTube audio links expire after a few hours. If `<audio>` emits 403/error → auto-fetch fresh URL for same video ID and resume from `currentTime`.
* **Network drop / Offline:** Listen for `offline` event → pause audio, display `WifiOff` icon badge. Auto-reconnect when `online` event fires.
* **Invalid or Age-restricted videos:** Check `yt-dlp` output format. If video unavailable → display clean Material 3 snackbar error ("Track unavailable"), don't crash app.

### 4.3 Desktop & Window Edge Cases
* **Multi-monitor / High-DPI (125%, 150%, 200% Windows scaling):** Convert logical px to physical px via Tauri monitor `scale_factor`. Island always stays pinned to top-center of primary screen.
* **Click-through accuracy:** Hit-test check includes 14px safety margin. Clicks outside active island pass directly to background apps. Never swallow user desktop clicks.
* **Click outside to collapse:** Clicking anywhere outside the expanded island or pressing `Escape` collapses island back to Pill (if playing) or Hidden (if idle).
* **Zero CPU idle:** Audio paused + hidden → Web Audio `AudioContext.suspend()`, cancel `requestAnimationFrame`, Rust cursor polling sleeps. 0% CPU consumption.

---

## 5. File Structure & Implementation Units

```
f:/Projects/Kitkat-Desktop/
├── src-tauri/
│   ├── Cargo.toml                  # Tauri v2, tokio, reqwest, serde, windows-rs
│   ├── tauri.conf.json             # Transparent borderless island window config
│   └── src/
│       ├── main.rs                 # Tauri entrypoint
│       ├── lib.rs                  # Module registry & command routing
│       ├── window.rs               # Win32 click-through, cursor poll, centering
│       └── ytdlp.rs                # yt-dlp binary resolver, downloader, search & stream
├── src/
│   ├── index.html                  # Island DOM container
│   ├── style.css                   # Material 3 dark styles, typography, layout
│   ├── core/
│   │   ├── anim.ts                 # Spring physics solver (SwiftUI / Coucou mirror)
│   │   ├── icons.ts                # Lucide SVG icon definitions (no emoji)
│   │   ├── audio.ts                # HTML5 audio player, stream manager, analyser
│   │   └── media_session.ts        # OS lockscreen & hardware media key bindings
│   ├── island/
│   │   ├── fsm.ts                  # Island state machine (Hidden -> Pill -> Panel)
│   │   └── view.ts                 # Island DOM morphing, hit-test reporter
│   ├── player/
│   │   ├── search.ts               # Debounced search & results rendering
│   │   └── controls.ts             # Play/Pause, scrubber slider, volume control
│   └── main.ts                     # App bootstrap & event wiring
├── package.json                    # Vite 6 + TypeScript (Zero heavy frontend deps)
└── tsconfig.json
```


