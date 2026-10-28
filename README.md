# KitKat Music

<p align="center">
  <img src="public/logo.png" alt="KitKat Music Logo" width="128" height="128" />
</p>

<p align="center">
  <strong>Dynamic Island Desktop Music Player for Windows</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Windows%2010%20%7C%2011-0078D6?logo=windows&logoColor=white" alt="Platform" />
  <img src="https://img.shields.io/badge/Framework-Tauri%20v2-24C8D8?logo=tauri&logoColor=white" alt="Tauri v2" />
  <img src="https://img.shields.io/badge/Language-Rust%20%7C%20TypeScript-DEA584?logo=rust&logoColor=white" alt="Rust & TypeScript" />
  <img src="https://img.shields.io/badge/Version-v1.2.0-blue" alt="Version 1.2.0" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License MIT" />
</p>

---

## Overview

**KitKat Music** brings the modern Dynamic Island interaction paradigm to Windows 10 and 11. Instead of cluttering your taskbar with heavy playback windows, KitKat lives right at the top of your screen as a hardware-accelerated, floating dynamic notch.

It smoothly morphs between a discreet wake strip, an ambient music pill, and an expanded dashboard with YouTube music search, animated waveforms, dynamic album glow, and hardware media key integration.

KitKat uses native Win32 window clipping (`SetWindowRgn`) and click-through hit testing. When minimized, surrounding screen space remains fully interactive without obstruction.

---

## Key Features

### 1. Dynamic Island Adaptive States
- **Wake Strip**: A clean 6px notch indicator resting at the display's top edge when minimized or idle.
- **Status Pill**: A compact 34px floating capsule displaying track details, album art, and real-time audio visualizers (Dancing Bars, Smooth Wave, or Beat Pulse).
- **Expanded Dashboard**: Full playback controls, animated scrubbers, volume controls, search access, and customization.
- **In-Island YouTube Search**: Search tracks and artists directly inside the island with debounced extraction and instant streaming.

### 2. Audio Pipeline & YouTube Streaming
- **HTML5 Web Audio Engine**: Gapless playback with automated stream format negotiation (`yt-dlp`).
- **Progressive Stream Resolution**: Prioritizes fast, buffer-free direct HTTPS progressive streams (`m4a`, `mp4`).
- **Media Session API**: Works seamlessly with hardware media keys (Play/Pause, Next Track, Previous Track, Seek).
- **Configurable Seek Jumps**: 5s, 10s, 15s, or 30s jump increments.

### 3. Ambient Glow & Visual Craft
- **Dynamic Ambient Blur Bleed**: Soft atmospheric glow reflecting the current playing album cover.
- **Fine-Grained Blur Controls**: 3 independent M3 sliders for Background Blur Radius, Blur Opacity, and Color Saturation, with a single master toggle.
- **Horizon Eclipse Backlit Bloom**: Multi-stop radial gradients creating a hardware bezel glow.
- **Zeroable Island Drop Shadows**: Fully customizable, black-only elevation shadow across all island states.
- **Squiggly Waveform Progress**: Choose between an animated squiggly wave, still wave, continuous classic bar, or dotted seekbar.

### 4. Customization & Theming
- **Luminous Bento Settings**: Dedicated customization app with live interactive preview.
- **Canvases**: Pure Black (OLED), Deep Night, and Charcoal.
- **Accent Presets**: Curated palette (Mint Emerald, Sky Cyan, Coral Flame, Amber Gold, Lavender, Rose, Lime, Slate).
- **Physics Customization**: Second-order implicit Euler spring animation dynamics (Snappy, Balanced, or Gentle).
- **Window Geometry**: Configurable panel widths (Compact 520px, Standard 580px, Wide 640px) and notch offsets.

### 5. System Tray & Silent Updates
- **System Tray**: Context menu to toggle the island, open settings, or exit.
- **Auto-Minimize**: Automatically tucks back into a compact pill after customizable idle timeouts (Never, 5s, 10s, 15s).
- **Background Auto-Updater**: Directly connects to GitHub releases, downloads NSIS installers, and updates automatically.

---

## Tech Stack

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Backend & Runtime** | Tauri v2 & Rust | Lightweight OS integration, IPC, native window shaping, tray icon |
| **Frontend** | TypeScript & Vite | High-performance reactive UI rendering |
| **Styles** | Vanilla CSS (Design Tokens) | Glassmorphism, CSS variables, and GPU-accelerated transforms |
| **Physics** | Custom Coucou Engine | Second-order implicit Euler spring animation equations |
| **Audio Extraction** | yt-dlp & Node.js Runtime | YouTube audio streaming and query resolution |
| **OS Windowing** | Win32 API (`user32.dll`) | Non-rectangular window clipping, click-through transparency |

---

## Getting Started

### Prerequisites
- **Windows 10 or 11** (64-bit)
- **Node.js** (v18 or later) & `npm`
- **Rust Toolchain**: Install via [rustup.rs](https://rustup.rs/)
- **yt-dlp**: Available in your system `PATH` (used for audio extraction)
- **Visual Studio C++ Build Tools** (Standard for Rust Windows compilation)

### Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Prince-1652/Kit-Kat-Music.git
   cd Kit-Kat-Music
   ```

2. **Install frontend dependencies:**
   ```bash
   npm install
   ```

3. **Run the dev server with live-reload:**
   ```bash
   npm run tauri dev
   ```

4. **Execute automated test suites:**
   ```bash
   npm test
   ```

---

## Building the Executable (.exe)

To compile a release build and generate a standalone Windows installer:

```bash
npm run tauri build
```

The output artifacts will be located at:
```text
src-tauri/target/release/
├── kitkat-desktop.exe             # Portable standalone executable
└── bundle/nsis/
    └── KitKat_1.2.0_x64-setup.exe # Standard Windows installer
```

---

## Project Structure

```text
Kit-Kat-Music/
├── public/
│   └── logo.png             # Application branding logo
├── src/
│   ├── core/
│   │   ├── anim.ts          # Coucou spring physics engine
│   │   ├── audio.ts         # HTML5 Web Audio playback engine
│   │   ├── config.ts        # App configuration, CSS design tokens, and persistence
│   │   ├── icons.ts         # Lightweight SVG icon pack
│   │   └── media_session.ts # OS System Media Transport Controls integration
│   ├── island/
│   │   ├── fsm.ts           # Island Finite State Machine (Hidden / Pill / Panel)
│   │   └── view.ts          # Window bounds synchronization and layout geometry
│   ├── player/
│   │   ├── controls.ts      # Playback controls and seekbars
│   │   └── search.ts        # In-island YouTube search and query debouncing
│   ├── main.ts              # Island entry point and IPC orchestration
│   ├── settings.ts          # Luminous Bento customization dashboard
│   ├── settings.css         # Customization dashboard design tokens and layouts
│   └── style.css            # Dynamic Island styling, glow layers, and animations
├── src-tauri/
│   ├── src/
│   │   ├── lib.rs           # Tauri command registrations, updater IPC, and app setup
│   │   ├── tray.rs          # Windows system notification area tray configuration
│   │   ├── window.rs        # Win32 native window clipping and hit-testing
│   │   └── ytdlp.rs         # yt-dlp audio stream extraction and process manager
│   ├── tauri.conf.json      # Tauri application and window configurations
│   └── Cargo.toml           # Rust crate dependencies and build configuration
├── tests/                   # Automated Node.js unit tests
├── package.json
└── vite.config.ts
```

---

## Keyboard Controls & Interactions

| Action | Control |
| :--- | :--- |
| **Play / Pause** | `Spacebar` / Media Play-Pause Key |
| **Next / Previous Track** | `MediaNextTrack` / `MediaPreviousTrack` |
| **Seek Forward / Back** | Custom skip button (5s / 10s / 15s / 30s) |
| **Wake Island** | Hover top notch or click wake strip |
| **Expand / Minimize** | Click anywhere on the island pill |
| **Search Music** | Click the search bar in the expanded panel |
| **Open Customization** | Click gear icon in panel or right-click Tray Icon |

---

## License

This project is licensed under the [MIT License](LICENSE)
