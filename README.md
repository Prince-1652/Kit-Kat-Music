# KitKat Music

KitKat Music is a lightweight, hardware-accelerated Dynamic Island desktop music player for Windows. Built on Tauri v2 and Rust, it provides a persistent top-of-screen interface that seamlessly expands from a discreet notch strip into a compact status pill or a full-featured music dashboard.

---

## Overview

Traditional desktop music players require dedicated taskbar space or bulky floating windows. KitKat Music adopts the Dynamic Island paradigm:
- Anchored directly beneath the top screen edge or display notch.
- Uses native OS transparent click-through hit-testing so only the active island captures input, keeping surrounding monitor space fully interactive.
- Driven by a finite state machine with second-order spring dynamics for fluid fluid transitions.

---

## Features

### Adaptive Island States
- **Wake Strip**: A minimal 6px notch indicator at the top of the display when idle or minimized. Hovering or clicking smoothly wakes the player.
- **Status Pill**: A compact 34px rounded pill displaying current song title, thumbnail, and live audio visualizer equalizer (dancing bars, wave, or beat pulse).
- **Expanded Panel**: A full playback dashboard with track search, volume control, animated seekbar, and transport controls.
- **Search Panel**: Instant in-app song search with debounced YouTube query extraction, allowing track selection directly from the island.

### Fluid Playback & Audio Pipeline
- Standalone HTML5 Audio engine integrated with native OS Media Session API (supports keyboard media keys: Play/Pause, Next Track, Previous Track).
- Automated yt-dlp stream extraction with cache and automatic format resolution.
- Configurable skip forward and backward durations (5s, 10s, 15s, 30s).

### Customization Dashboard
A dedicated settings application (`KitKat Customization`) accessible via the gear icon or system tray:
- **Themes & Surfaces**: Customizable accent colors, OLED pure black / deep night / charcoal surfaces, and frosted glass (acrylic blur) materials.
- **Seekbar Styles**: Continuous classic bar, squiggly animated wave, still wave, and dotted bar modes.
- **Geometry & Sizing**: Configurable panel width presets (Compact 520px, Standard 580px, Wide 640px), adjustable corner roundness, and album art corner radius presets.
- **Behavior**: Auto-minimize timers, spring animation speeds (Snappy, Smooth, Gentle), and top notch offset adjustments.

### System Tray & Background Operation
- Runs discreetly in the Windows notification area with a custom tray icon.
- Context menu options to quickly Toggle Island, Open Settings, or Exit.
- Automatically handles click-outside events and Windows blur triggers to tuck back into a pill.

---

## Tech Stack

- **Core Framework**: Tauri v2 (Rust backend + WebView2 frontend)
- **Frontend**: TypeScript, Vanilla CSS (Design Tokens), Vite 6
- **Window Management**: Win32 native APIs (`SetWindowLongPtrW`, `SetWindowPos`, `SetWindowRgn` for precise hit-test clipping)
- **Audio & Media**: HTML5 Web Audio, OS System Media Transport Controls, yt-dlp CLI
- **Physics**: Custom second-order implicit Euler spring animation engine

---

## Prerequisites

Before building from source, ensure the following tools are installed on your system:

1. **Node.js** (v18 or higher) and `npm`.
2. **Rust** (stable toolchain) via [rustup](https://rustup.rs/).
3. **yt-dlp**: Required for audio stream extraction. Ensure `yt-dlp` is available in your system `PATH`.
4. **C++ Build Tools**: Visual Studio C++ Build Tools or Windows SDK (standard for Rust on Windows).

---

## Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/Prince-1652/Kit-Kat-Music.git
cd Kit-Kat-Music
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run in Development Mode
To start the Vite development server with Tauri live-reload:
```bash
npm run tauri dev
```

### 4. Run Unit Tests
To run the automated test suite (spring physics, layout consistency, and stream verification):
```bash
npm test
```

---

## Building the Executable (.exe)

To generate an optimized, standalone Windows binary and installer:

```bash
npm run tauri build
```

The compiled binaries will be output to:
```text
src-tauri/target/release/
  kitkat-desktop.exe                  # Standalone executable
  bundle/nsis/
    kitkat-desktop_0.1.0_x64-setup.exe # Windows NSIS Installer
```

---

## Project Structure

```text
Kit-Kat-Music/
├── public/
│   └── logo.png                # Application branding logo
├── src/
│   ├── core/
│   │   ├── anim.ts             # Spring physics simulation
│   │   ├── audio.ts            # HTML5 audio player engine
│   │   ├── config.ts           # Config schema, tokens, and storage
│   │   ├── icons.ts            # SVG icon definitions
│   │   └── media_session.ts    # Hardware media key integration
│   ├── island/
│   │   ├── fsm.ts              # Finite state machine (Hidden / Pill / Panel)
│   │   └── view.ts             # Window bounds synchronization and layout
│   ├── player/
│   │   ├── controls.ts         # Playback controls and seekbars
│   │   └── search.ts           # Song search manager and query debouncing
│   ├── main.ts                 # Main island entry point
│   ├── settings.ts             # Customization dashboard entry point
│   ├── settings.css            # Customization dashboard styles
│   └── style.css               # Dynamic island layout and animations
├── src-tauri/
│   ├── src/
│   │   ├── lib.rs              # Tauri command registrations and setup
│   │   ├── tray.rs             # Windows system tray configuration
│   │   ├── window.rs           # Native Win32 window clipping & click-through
│   │   └── ytdlp.rs            # Audio stream extraction IPC handler
│   ├── tauri.conf.json         # Tauri application and window configurations
│   └── Cargo.toml              # Rust crate dependencies
├── tests/                      # Automated test suite
├── package.json
└── vite.config.ts
```

---

## License

This project is licensed under the MIT License. See the LICENSE file for details.
