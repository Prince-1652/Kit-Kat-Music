import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  DEFAULT_CONFIG,
  THEME_PRESETS,
  loadConfig,
  saveConfig,
  applyThemeToDOM,
  type AppConfig,
  type SeekbarStyle,
  type PanelWidthPreset,
  type ArtworkShapePreset,
  type WaveSpeedPreset,
} from "./core/config";
import { renderIcon } from "./core/icons";

interface UpdateInfo {
  available: boolean;
  current_version: string;
  latest_version: string;
  release_notes: string;
  download_url?: string;
  asset_name?: string;
}

interface UpdateProgress {
  percent: number;
  downloaded_bytes: number;
  total_bytes: number;
}

window.addEventListener("DOMContentLoaded", () => {
  const root = document.getElementById("settings-root");
  if (!root) return;
  const container = root;

  let cfg: AppConfig = loadConfig();
  applyThemeToDOM(cfg);

  // Updater state
  let updateStatus: "idle" | "checking" | "available" | "up-to-date" | "downloading" | "error" = "idle";
  let updateData: UpdateInfo | null = null;
  let updateErrorMsg = "";
  let updateProgress: UpdateProgress | null = null;

  function escapeHtml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  async function performUpdateCheck() {
    updateStatus = "checking";
    updateErrorMsg = "";
    render();
    try {
      const info = await invoke<UpdateInfo>("check_for_updates");
      updateData = info;
      updateStatus = info.available ? "available" : "up-to-date";
    } catch (err) {
      updateStatus = "error";
      updateErrorMsg = err instanceof Error ? err.message : String(err);
    }
    render();
  }

  async function performInstallUpdate() {
    if (!updateData || !updateData.download_url) return;
    updateStatus = "downloading";
    updateProgress = { percent: 0, downloaded_bytes: 0, total_bytes: 0 };
    render();
    try {
      await invoke("download_and_install_update", {
        downloadUrl: updateData.download_url,
        filename: updateData.asset_name || "KitKat-Setup.exe",
      });
    } catch (err) {
      updateStatus = "error";
      updateErrorMsg = err instanceof Error ? err.message : String(err);
      render();
    }
  }

  // Sync startup setting from Windows registry if running inside Tauri
  invoke<boolean>("get_launch_at_startup")
    .then((enabled) => {
      if (typeof enabled === "boolean" && enabled !== cfg.island.launchAtStartup) {
        cfg = { ...cfg, island: { ...cfg.island, launchAtStartup: enabled } };
        saveConfig(cfg);
        render();
      }
    })
    .catch(() => {});

  // Live simulation interactive preview state
  let previewMode: "panel" | "pill" = "panel";
  let previewPlaying = true;
  let previewScrubPercent = 42;

  function formatTime(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  }

  function renderOptionControl(
    id: string,
    options: { val: string; label: string }[],
    currentVal: string
  ): string {
    const segments = options
      .map(
        (opt) =>
          `<button class="m3-segment-btn ${currentVal === opt.val ? "selected" : ""}" data-val="${opt.val}">${opt.label}</button>`
      )
      .join("");

    const selectOptions = options
      .map(
        (opt) =>
          `<option value="${opt.val}" ${currentVal === opt.val ? "selected" : ""}>${opt.label}</option>`
      )
      .join("");

    return `
      <div class="m3-control-responsive" id="${id}">
        <div class="m3-segmented-group m3-responsive-segments">
          ${segments}
        </div>
        <div class="m3-select-wrapper m3-responsive-select">
          <select class="m3-select" data-group="${id}">
            ${selectOptions}
          </select>
          <span class="m3-select-arrow">${renderIcon("chevronDown")}</span>
        </div>
      </div>
    `;
  }

  function render() {
    const accentObj = THEME_PRESETS[cfg.theme.accentColor] || THEME_PRESETS["#4ADE80"];
    const totalDuration = 200; // 3:20
    const currentTime = Math.round((previewScrubPercent / 100) * totalDuration);

    const isWavy = cfg.seekbar.style === "wavy-animated" || cfg.seekbar.style === "wavy-still";
    const wavyClass = cfg.seekbar.style === "wavy-animated"
      ? "m3-wavy-animated"
      : cfg.seekbar.style === "wavy-still"
      ? "m3-wavy-still"
      : "";

    container.innerHTML = `
      <header class="m3-app-bar">
        <div class="app-bar-leading">
          <img src="/logo.png" class="app-bar-logo" alt="KitKat" />
          <div>
            <div class="app-bar-title">KitKat Customization</div>
            <div class="app-bar-subtitle">Dynamic Island Player Preferences</div>
          </div>
        </div>
      </header>

      <div class="settings-content">
        <!-- Live Interactive Simulation Preview Card -->
        <div class="preview-card ${previewPlaying ? "is-playing" : ""}">
          <div class="preview-header">
            <div class="preview-header-left">
              <span class="preview-badge">Live Preview</span>
              <span style="font-size: 11px; color: var(--kk-text-dim); font-weight: 500;">${accentObj.label}</span>
              <span class="preview-state-indicator" style="font-size: 11px; color: ${previewPlaying ? "var(--kk-primary)" : "var(--kk-text-dim)"}; font-weight: 600;">
                • ${previewPlaying ? "Playing" : "Paused"}
              </span>
            </div>
            <div class="m3-segmented-group">
              <button class="m3-segment-btn ${previewMode === "panel" ? "selected" : ""}" id="btn-mode-panel">Panel View</button>
              <button class="m3-segment-btn ${previewMode === "pill" ? "selected" : ""}" id="btn-mode-pill">Pill View</button>
            </div>
          </div>          <div class="preview-stage">
            <div class="island state-${previewMode}" id="preview-island" style="width: ${previewMode === 'pill' ? 280 : (cfg.island.panelWidth === 'compact' ? 520 : cfg.island.panelWidth === 'expanded' ? 640 : 580)}px; height: ${previewMode === 'pill' ? 34 : 136}px; border-radius: 0 0 ${previewMode === 'pill' ? 17 : 28}px ${previewMode === 'pill' ? 17 : 28}px; cursor: ${previewMode === 'pill' ? 'pointer' : 'default'};">
              <div class="island-ambient-glow" style="background-image: url('/logo.png'); filter: blur(${cfg.island.bgBlurRadiusPx ?? 36}px) saturate(200%) brightness(1.22); opacity: ${previewMode === 'pill' ? ((cfg.island.bgBlurOpacity ?? 62) * 0.007).toFixed(2) : ((cfg.island.bgBlurOpacity ?? 62) / 100).toFixed(2)};"></div>
              <div id="island-wake" class="island-wake"></div>

              <div id="island-pill" class="island-pill" style="${previewMode === 'pill' ? 'display: flex;' : 'display: none;'}">
                <div class="pill-thumb ${cfg.island.eqStyle === 'pulse' ? 'has-pulse' : ''}" style="background-image: url('/logo.png');"></div>
                <div class="pill-title">KitKat Music</div>
                <div class="pill-eq style-${cfg.island.eqStyle} ${previewPlaying && cfg.island.eqStyle !== 'off' ? 'animated' : ''}" style="${cfg.island.eqStyle === 'off' ? 'display: none;' : ''}">
                  ${
                    cfg.island.eqStyle === "pulse"
                      ? `<span class="pulse-orb"></span>`
                      : `
                    <span class="bar"></span>
                    <span class="bar"></span>
                    <span class="bar"></span>
                    <span class="bar"></span>
                  `
                  }
                </div>
              </div>

              <div id="island-panel" class="island-panel" style="${previewMode === 'panel' ? 'display: flex;' : 'display: none;'}">
                <div class="panel-header">
                  <div class="search-bar">
                    ${renderIcon("search")}
                    <input type="text" class="search-input" placeholder="Search tracks or artists..." readonly value="" />
                  </div>
                  <button class="btn-settings-header" title="Customize KitKat">
                    ${renderIcon("settings")}
                  </button>
                </div>

                <div id="player-controls-container">
                  <div class="player-main">
                    <div class="album-art-wrap ${previewPlaying ? 'is-playing' : ''}">
                      <img src="/logo.png" style="display: block; border-radius: inherit; transform: none;" alt="Artwork" />
                    </div>
                    <div class="player-details">
                      <div class="details-header">
                        <div class="track-text">
                          <div class="track-title">KitKat Music</div>
                          <div class="track-artist">Search music to play</div>
                        </div>
                      </div>

                      <div class="seekbar-row" id="preview-scrubber-row">
                        <span class="time-label" style="${cfg.seekbar.showTimeLabels ? '' : 'display: none;'}">
                          ${formatTime(currentTime)}
                        </span>
                        <div class="seekbar-track-container ${isWavy ? 'wavy-mode' : ''} ${cfg.seekbar.style === 'with-stops' ? 'with-stops' : ''}" id="preview-scrubber-track">
                          <div class="seekbar-track-bg"></div>
                          <div class="seekbar-fill ${wavyClass}" style="display: block; width: ${previewScrubPercent}%;">
                            <div class="wavy-flow-inner"></div>
                          </div>
                          <div class="seekbar-thumb-dot" style="left: clamp(7px, ${previewScrubPercent}%, calc(100% - 7px)); ${cfg.seekbar.showThumb ? '' : 'display: none;'}"></div>
                          <input type="range" class="thick-seekbar" min="0" max="100" value="${previewScrubPercent}" style="opacity: 0; position: absolute; inset: 0; width: 100%; height: 100%; cursor: pointer; z-index: 5;" />
                        </div>
                        <span class="time-label" style="${cfg.seekbar.showTimeLabels ? '' : 'display: none;'}">
                          ${formatTime(totalDuration)}
                        </span>
                      </div>

                      <div class="controls-bottom-row ${cfg.island.showVolumeControl ? '' : 'has-no-vol'}">
                        <div class="transport-group">
                          <button class="btn-icon" id="btn-prev-step-back" title="Previous">${renderIcon("skipBack")}</button>
                          <button class="btn-play-glyph" id="btn-prev-play-toggle" title="Play/Pause">
                            ${renderIcon(previewPlaying ? "pause" : "play")}
                          </button>
                          <button class="btn-icon" id="btn-prev-step-fwd" title="Next">${renderIcon("skipForward")}</button>
                        </div>
                        <div class="vol-group" style="${cfg.island.showVolumeControl ? '' : 'display: none;'}">
                          <button class="btn-icon" title="Mute/Unmute">${renderIcon("volume2")}</button>
                          <input type="range" class="vol-slider" min="0" max="1" step="0.05" value="0.8" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Section 1: Color Palette & Surfaces -->
        <section class="m3-section">
          <div class="section-label">Theme & Colors</div>
          <div class="m3-card">
            <div class="setting-row">
              <div class="setting-text">
                <div class="setting-title">Accent Color</div>
                <div class="setting-desc">Choose your favorite color for buttons, waves, and highlights</div>
              </div>
              <div class="color-swatches" id="swatches-container">
                ${Object.entries(THEME_PRESETS)
                  .map(
                    ([hex, item]) => `
                  <button
                    class="color-swatch-btn ${cfg.theme.accentColor === hex ? "selected" : ""}"
                    data-hex="${hex}"
                    style="background-color: ${item.primary};"
                    title="${item.label}"
                  >
                    <span class="icon-check">${renderIcon("check")}</span>
                  </button>
                `
                  )
                  .join("")}
              </div>
            </div>

            <div class="setting-row">
              <div class="setting-text">
                <div class="setting-title">Dark Mode Theme</div>
                <div class="setting-desc">Choose your dark canvas (Pure Black for OLED screens, Deep Night, or Charcoal)</div>
              </div>
              ${renderOptionControl(
                "group-surface",
                [
                  { val: "oled", label: "Pure Black" },
                  { val: "deep", label: "Deep Night" },
                  { val: "charcoal", label: "Charcoal" },
                ],
                cfg.theme.darkSurface
              )}
            </div>

            <div class="setting-row">
              <div class="setting-text">
                <div class="setting-title">Background Blur Radius</div>
                <div class="setting-desc">Adjust how soft and diffuse the ambient glow effect appears</div>
              </div>
              <div class="m3-slider-row">
                <input type="range" class="m3-slider" id="slider-bg-blur" min="12" max="64" step="2" value="${cfg.island.bgBlurRadiusPx ?? 36}" />
                <span class="m3-slider-value" id="val-bg-blur">${cfg.island.bgBlurRadiusPx ?? 36}px</span>
              </div>
            </div>

            <div class="setting-row">
              <div class="setting-text">
                <div class="setting-title">Background Blur Opacity</div>
                <div class="setting-desc">Control the intensity and brightness of the ambient background glow</div>
              </div>
              <div class="m3-slider-row">
                <input type="range" class="m3-slider" id="slider-bg-blur-opacity" min="10" max="100" step="5" value="${cfg.island.bgBlurOpacity ?? 62}" />
                <span class="m3-slider-value" id="val-bg-blur-opacity">${cfg.island.bgBlurOpacity ?? 62}%</span>
              </div>
            </div>

            <div class="setting-row">
              <div class="setting-text">
                <div class="setting-title">Island Drop Shadow</div>
                <div class="setting-desc">Adjust the depth and intensity of the shadow cast by the island</div>
              </div>
              <div class="m3-slider-row">
                <input type="range" class="m3-slider" id="slider-drop-shadow" min="0" max="100" step="5" value="${cfg.island.dropShadow ?? 85}" />
                <span class="m3-slider-value" id="val-drop-shadow">${cfg.island.dropShadow ?? 85}%</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Section 2: Seekbar & Progress -->
        <section class="m3-section">
          <div class="section-label">Progress Bar & Wave</div>
          <div class="m3-card">
            <div class="setting-row">
              <div class="setting-text">
                <div class="setting-title">Progress Bar Style</div>
                <div class="setting-desc">Choose between animated squiggly wave, still wave, classic bar, or dotted line</div>
              </div>
              ${renderOptionControl(
                "group-seekbar-style",
                [
                  { val: "wavy-animated", label: "Animated Wave" },
                  { val: "wavy-still", label: "Still Wave" },
                  { val: "continuous", label: "Classic Bar" },
                  { val: "with-stops", label: "Dotted Bar" },
                ],
                cfg.seekbar.style
              )}
            </div>

            <div class="setting-row">
              <div class="setting-text">
                <div class="setting-title">Wave Animation Speed</div>
                <div class="setting-desc">How fast the squiggly line ripples while music is playing</div>
              </div>
              ${renderOptionControl(
                "group-wave-speed",
                [
                  { val: "relaxed", label: "Gentle" },
                  { val: "normal", label: "Normal" },
                  { val: "energetic", label: "Fast" },
                ],
                cfg.island.waveSpeed
              )}
            </div>

            <div class="setting-row">
              <div class="setting-text">
                <div class="setting-title">Show Progress Dot</div>
                <div class="setting-desc">Display a circular pointer dot at current playback position</div>
              </div>
              <div class="m3-switch ${cfg.seekbar.showThumb ? "active" : ""}" id="switch-thumb">
                <div class="m3-switch-thumb"></div>
              </div>
            </div>

            <div class="setting-row">
              <div class="setting-text">
                <div class="setting-title">Song Timestamps</div>
                <div class="setting-desc">Show current time and total song length on the sides</div>
              </div>
              <div class="m3-switch ${cfg.seekbar.showTimeLabels ? "active" : ""}" id="switch-timelabels">
                <div class="m3-switch-thumb"></div>
              </div>
            </div>
          </div>
        </section>

        <!-- Section 3: Player Size & Appearance -->
        <section class="m3-section">
          <div class="section-label">Player Size & Appearance</div>
          <div class="m3-card">
            <div class="setting-row">
              <div class="setting-text">
                <div class="setting-title">Expanded Player Width</div>
                <div class="setting-desc">Choose player size when expanded (Compact for laptops, Standard, or Wide)</div>
              </div>
              ${renderOptionControl(
                "group-panel-width",
                [
                  { val: "compact", label: "Compact (520px)" },
                  { val: "standard", label: "Standard (580px)" },
                  { val: "expanded", label: "Wide (640px)" },
                ],
                cfg.island.panelWidth
              )}
            </div>

            <div class="setting-row">
              <div class="setting-text">
                <div class="setting-title">Album Cover Corner Radius</div>
                <div class="setting-desc">Adjust how rounded the album artwork corners appear without cutting or stretching the picture</div>
              </div>
              ${renderOptionControl(
                "group-art-shape",
                [
                  { val: "squircle", label: "Smooth (12px)" },
                  { val: "circle", label: "Curved (20px)" },
                  { val: "sharp", label: "Square (4px)" },
                ],
                cfg.island.artworkShape
              )}
            </div>

            <div class="setting-row">
              <div class="setting-text">
                <div class="setting-title">Album Cover Glow</div>
                <div class="setting-desc">Cast a colorful ambient light behind the album cover while playing</div>
              </div>
              <div class="m3-switch ${cfg.island.artworkGlow ? "active" : ""}" id="switch-art-glow">
                <div class="m3-switch-thumb"></div>
              </div>
            </div>

            <div class="setting-row">
              <div class="setting-text">
                <div class="setting-title">Volume Slider</div>
                <div class="setting-desc">Show the volume slider in the bottom right of the player</div>
              </div>
              <div class="m3-switch ${cfg.island.showVolumeControl ? "active" : ""}" id="switch-vol-control">
                <div class="m3-switch-thumb"></div>
              </div>
            </div>
          </div>
        </section>

        <!-- Section 4: Behavior & Motion -->
        <section class="m3-section">
          <div class="section-label">Behavior & Motion</div>
          <div class="m3-card">
            <div class="setting-row">
              <div class="setting-text">
                <div class="setting-title">Auto-Minimize</div>
                <div class="setting-desc">Automatically shrink back to a compact pill when idle</div>
              </div>
              ${renderOptionControl(
                "group-autohide",
                [
                  { val: "0", label: "Never" },
                  { val: "5", label: "After 5s" },
                  { val: "10", label: "After 10s" },
                  { val: "15", label: "After 15s" },
                ],
                String(cfg.island.autoHideSeconds)
              )}
            </div>

            <div class="setting-row">
              <div class="setting-text">
                <div class="setting-title">Animation Feel</div>
                <div class="setting-desc">How springy and fast the player opens and closes</div>
              </div>
              ${renderOptionControl(
                "group-spring",
                [
                  { val: "snappy", label: "Quick & Snappy" },
                  { val: "balanced", label: "Smooth" },
                  { val: "gentle", label: "Gentle & Soft" },
                ],
                cfg.island.springSpeed
              )}
            </div>

            <div class="setting-row">
              <div class="setting-text">
                <div class="setting-title">Mini Player Equalizer</div>
                <div class="setting-desc">Visual music effect shown in the compact mini pill</div>
              </div>
              ${renderOptionControl(
                "group-eq-style",
                [
                  { val: "bars", label: "Dancing Bars" },
                  { val: "wave", label: "Smooth Wave" },
                  { val: "pulse", label: "Beat Pulse" },
                  { val: "off", label: "Hidden" },
                ],
                cfg.island.eqStyle
              )}
            </div>

            <div class="setting-row">
              <div class="setting-text">
                <div class="setting-title">Skip Jump Time</div>
                <div class="setting-desc">Number of seconds skipped when pressing forward or back</div>
              </div>
              ${renderOptionControl(
                "group-skip",
                [
                  { val: "5", label: "5 seconds" },
                  { val: "10", label: "10 seconds" },
                  { val: "15", label: "15 seconds" },
                  { val: "30", label: "30 seconds" },
                ],
                String(cfg.island.skipDurationSecs)
              )}
            </div>

            <div class="setting-row">
              <div class="setting-text">
                <div class="setting-title">Launch at Startup</div>
                <div class="setting-desc">Automatically start KitKat in the background when Windows boots</div>
              </div>
              <div class="m3-switch ${cfg.island.launchAtStartup ? "active" : ""}" id="switch-autostart">
                <div class="m3-switch-thumb"></div>
              </div>
            </div>
          </div>
        </section>

        <!-- Section 5: App Updates & Version -->
        <section class="m3-section">
          <div class="section-label">App Updates & Version</div>
          <div class="m3-card">
            <div class="setting-row">
              <div class="setting-text">
                <div class="setting-title">KitKat Version</div>
                <div class="setting-desc">
                  Installed: <strong class="version-tag">v${updateData?.current_version || "1.1.0"}</strong>
                  ${updateStatus === "up-to-date" ? `<span class="update-status-pill success">Up to date</span>` : ""}
                  ${updateStatus === "available" ? `<span class="update-status-pill available">Update: ${escapeHtml(updateData?.latest_version || "")}</span>` : ""}
                  ${updateStatus === "checking" ? `<span class="update-status-pill checking">Checking...</span>` : ""}
                  ${updateStatus === "error" ? `<span class="update-status-pill error">Check failed</span>` : ""}
                </div>
              </div>
              <button id="btn-check-updates" class="btn-check-updates ${updateStatus === "checking" ? "loading" : ""}" ${updateStatus === "checking" || updateStatus === "downloading" ? "disabled" : ""}>
                ${renderIcon("refreshCw")}
                <span>${updateStatus === "checking" ? "Checking..." : "Check for Updates"}</span>
              </button>
            </div>

            ${
              updateStatus === "available" && updateData
                ? `
              <div class="update-card-banner">
                <div class="update-banner-header">
                  <div class="update-banner-title">
                    ${renderIcon("download")}
                    <span>KitKat ${escapeHtml(updateData.latest_version)} is available</span>
                  </div>
                  <button id="btn-start-install" class="btn-primary btn-install-update">
                    ${renderIcon("download")}
                    <span>Download & Install</span>
                  </button>
                </div>
                ${
                  updateData.release_notes
                    ? `
                  <div class="update-release-notes">
                    <div class="release-notes-label">What's New:</div>
                    <div class="release-notes-body">${escapeHtml(updateData.release_notes)}</div>
                  </div>
                `
                    : ""
                }
              </div>
            `
                : ""
            }

            ${
              updateStatus === "downloading"
                ? `
              <div class="update-card-banner downloading">
                <div class="update-progress-header">
                  <span>Downloading installer...</span>
                  <span class="update-percent">${updateProgress ? updateProgress.percent + "%" : "0%"}</span>
                </div>
                <div class="update-progress-track">
                  <div class="update-progress-fill" style="width: ${updateProgress ? updateProgress.percent : 0}%"></div>
                </div>
                <div class="update-progress-sub">
                  ${
                    updateProgress && updateProgress.total_bytes > 0
                      ? `${(updateProgress.downloaded_bytes / (1024 * 1024)).toFixed(1)} MB / ${(updateProgress.total_bytes / (1024 * 1024)).toFixed(1)} MB • Launching installer automatically`
                      : "Connecting to GitHub..."
                  }
                </div>
              </div>
            `
                : ""
            }

            ${
              updateStatus === "error"
                ? `
              <div class="update-card-banner error">
                <div class="update-error-text">${renderIcon("wifiOff")} <span>${escapeHtml(updateErrorMsg || "Could not check for updates.")}</span></div>
              </div>
            `
                : ""
            }

            <div class="setting-row">
              <div class="setting-text">
                <div class="setting-title">Auto-Check for Updates</div>
                <div class="setting-desc">Check GitHub for new releases automatically when opening customization</div>
              </div>
              <div class="m3-switch ${cfg.island.autoCheckUpdates ? "active" : ""}" id="switch-autoupdate">
                <div class="m3-switch-thumb"></div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <footer class="settings-footer">
        <button id="btn-reset-defaults" class="btn-secondary">Reset to Defaults</button>
        <button id="btn-done" class="btn-primary">Done</button>
      </footer>
    `;

    bindEvents();
  }

  function commitUpdate(newCfg: AppConfig) {
    cfg = newCfg;
    applyThemeToDOM(cfg);
    saveConfig(cfg);
    render();
  }

  function bindEvents() {
    // Window header & done buttons (Tauri native close handles OS titlebar)
    document.getElementById("btn-done")?.addEventListener("click", () => {
      invoke("close_settings").catch(() => {});
    });

    // Reset defaults button
    document.getElementById("btn-reset-defaults")?.addEventListener("click", () => {
      commitUpdate({ ...DEFAULT_CONFIG });
    });

    // Preview mode toggles
    document.getElementById("btn-mode-panel")?.addEventListener("click", () => {
      previewMode = "panel";
      render();
    });
    document.getElementById("btn-mode-pill")?.addEventListener("click", () => {
      previewMode = "pill";
      render();
    });

    // Preview interactive play/pause toggle in panel view
    document.getElementById("btn-prev-play-toggle")?.addEventListener("click", () => {
      previewPlaying = !previewPlaying;
      render();
    });

    // Preview interactive click on pill view
    const previewIsland = document.getElementById("preview-island");
    if (previewIsland && previewMode === "pill") {
      previewIsland.addEventListener("click", () => {
        previewPlaying = !previewPlaying;
        render();
      });
    }

    // Preview interactive scrubber
    const previewTrack = document.getElementById("preview-scrubber-track");
    if (previewTrack) {
      const handleScrub = (e: MouseEvent) => {
        const rect = previewTrack.getBoundingClientRect();
        const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        previewScrubPercent = Math.round(pos * 100);
        render();
      };
      previewTrack.addEventListener("click", handleScrub);
    }

    // Preview skip buttons
    document.getElementById("btn-prev-step-back")?.addEventListener("click", () => {
      previewScrubPercent = Math.max(0, previewScrubPercent - 8);
      render();
    });
    document.getElementById("btn-prev-step-fwd")?.addEventListener("click", () => {
      previewScrubPercent = Math.min(100, previewScrubPercent + 8);
      render();
    });

    // Swatches
    const swatches = document.querySelectorAll(".color-swatch-btn");
    swatches.forEach((btn) => {
      btn.addEventListener("click", () => {
        const hex = btn.getAttribute("data-hex");
        if (hex && THEME_PRESETS[hex]) {
          commitUpdate({
            ...cfg,
            theme: { ...cfg.theme, accentColor: hex },
          });
        }
      });
    });

    // Surface elevation (responsive segmented / select)
    bindSegmentGroup("group-surface", (val) => {
      commitUpdate({
        ...cfg,
        theme: { ...cfg.theme, darkSurface: val as "oled" | "deep" | "charcoal" },
      });
    });

    // Background blur radius slider
    const sliderBlur = document.getElementById("slider-bg-blur") as HTMLInputElement | null;
    const valBlur = document.getElementById("val-bg-blur");
    const previewGlow = document.querySelector("#preview-island .island-ambient-glow") as HTMLElement | null;
    sliderBlur?.addEventListener("input", () => {
      const val = parseInt(sliderBlur.value, 10);
      if (valBlur) valBlur.textContent = `${val}px`;
      if (previewGlow) previewGlow.style.filter = `blur(${val}px) saturate(200%) brightness(1.22)`;
      document.documentElement.style.setProperty("--kk-bg-blur", `${val}px`);
    });
    sliderBlur?.addEventListener("change", () => {
      const val = parseInt(sliderBlur.value, 10);
      commitUpdate({ ...cfg, island: { ...cfg.island, bgBlurRadiusPx: val } });
    });

    // Background blur opacity slider
    const sliderBlurOpacity = document.getElementById("slider-bg-blur-opacity") as HTMLInputElement | null;
    const valBlurOpacity = document.getElementById("val-bg-blur-opacity");
    sliderBlurOpacity?.addEventListener("input", () => {
      const val = parseInt(sliderBlurOpacity.value, 10);
      if (valBlurOpacity) valBlurOpacity.textContent = `${val}%`;
      const op = previewMode === "pill" ? (val * 0.007).toFixed(2) : (val / 100).toFixed(2);
      if (previewGlow) previewGlow.style.opacity = op;
      document.documentElement.style.setProperty("--kk-bg-blur-opacity", `${val / 100}`);
      document.documentElement.style.setProperty("--kk-bg-blur-opacity-pill", `${Math.round((val / 100) * 0.7 * 100) / 100}`);
    });
    sliderBlurOpacity?.addEventListener("change", () => {
      const val = parseInt(sliderBlurOpacity.value, 10);
      commitUpdate({ ...cfg, island: { ...cfg.island, bgBlurOpacity: val } });
    });

    // Island drop shadow slider
    const sliderDropShadow = document.getElementById("slider-drop-shadow") as HTMLInputElement | null;
    const valDropShadow = document.getElementById("val-drop-shadow");
    const previewIslandEl = document.getElementById("preview-island") as HTMLElement | null;
    sliderDropShadow?.addEventListener("input", () => {
      const val = parseInt(sliderDropShadow.value, 10);
      if (valDropShadow) valDropShadow.textContent = `${val}%`;
      const shadowAlpha = (val / 100).toFixed(2);
      const shadowBlur = Math.round((24 * val) / 85);
      const shadowY = Math.round((12 * val) / 85);
      const shadowCss = val === 0
        ? "none"
        : `0 ${shadowY}px ${shadowBlur}px -6px rgba(0, 0, 0, ${shadowAlpha})`;
      document.documentElement.style.setProperty("--kk-island-drop-shadow", shadowCss);
      document.documentElement.style.setProperty("--kk-drop-shadow-opacity", shadowAlpha);
      if (previewIslandEl) {
        previewIslandEl.style.boxShadow = shadowCss;
      }
    });
    sliderDropShadow?.addEventListener("change", () => {
      const val = parseInt(sliderDropShadow.value, 10);
      commitUpdate({ ...cfg, island: { ...cfg.island, dropShadow: val } });
    });

    // Seekbar style (responsive segmented / select)
    bindSegmentGroup("group-seekbar-style", (val) => {
      commitUpdate({
        ...cfg,
        seekbar: { ...cfg.seekbar, style: val as SeekbarStyle },
      });
    });

    // Wave speed (responsive segmented / select)
    bindSegmentGroup("group-wave-speed", (val) => {
      commitUpdate({
        ...cfg,
        island: { ...cfg.island, waveSpeed: val as WaveSpeedPreset },
      });
    });

    // Switch thumb
    const switchThumb = document.getElementById("switch-thumb");
    switchThumb?.addEventListener("click", () => {
      commitUpdate({
        ...cfg,
        seekbar: { ...cfg.seekbar, showThumb: !cfg.seekbar.showThumb },
      });
    });

    // Switch time labels
    const switchTimeLabels = document.getElementById("switch-timelabels");
    switchTimeLabels?.addEventListener("click", () => {
      commitUpdate({
        ...cfg,
        seekbar: { ...cfg.seekbar, showTimeLabels: !cfg.seekbar.showTimeLabels },
      });
    });

    // Expanded panel width (responsive segmented / select)
    bindSegmentGroup("group-panel-width", (val) => {
      commitUpdate({
        ...cfg,
        island: { ...cfg.island, panelWidth: val as PanelWidthPreset },
      });
    });

    // Artwork shape (responsive segmented / select)
    bindSegmentGroup("group-art-shape", (val) => {
      commitUpdate({
        ...cfg,
        island: { ...cfg.island, artworkShape: val as ArtworkShapePreset },
      });
    });

    // Artwork glow switch
    const switchArtGlow = document.getElementById("switch-art-glow");
    switchArtGlow?.addEventListener("click", () => {
      commitUpdate({
        ...cfg,
        island: { ...cfg.island, artworkGlow: !cfg.island.artworkGlow },
      });
    });

    // Volume control switch
    const switchVolControl = document.getElementById("switch-vol-control");
    switchVolControl?.addEventListener("click", () => {
      commitUpdate({
        ...cfg,
        island: { ...cfg.island, showVolumeControl: !cfg.island.showVolumeControl },
      });
    });

    // Autohide (responsive segmented / select)
    bindSegmentGroup("group-autohide", (val) => {
      commitUpdate({
        ...cfg,
        island: { ...cfg.island, autoHideSeconds: parseInt(val, 10) },
      });
    });

    // Spring dynamics (responsive segmented / select)
    bindSegmentGroup("group-spring", (val) => {
      commitUpdate({
        ...cfg,
        island: { ...cfg.island, springSpeed: val as "snappy" | "balanced" | "gentle" },
      });
    });

    // EQ Style (responsive segmented / select)
    bindSegmentGroup("group-eq-style", (val) => {
      commitUpdate({
        ...cfg,
        island: { ...cfg.island, eqStyle: val as "bars" | "wave" | "pulse" | "off" },
      });
    });

    // Skip jump (responsive segmented / select)
    bindSegmentGroup("group-skip", (val) => {
      commitUpdate({
        ...cfg,
        island: { ...cfg.island, skipDurationSecs: parseInt(val, 10) as 5 | 10 | 15 | 30 },
      });
    });

    // Switch launch at startup
    const switchAutostart = document.getElementById("switch-autostart");
    switchAutostart?.addEventListener("click", async () => {
      const nextVal = !cfg.island.launchAtStartup;
      try {
        await invoke("set_launch_at_startup", { enable: nextVal });
      } catch (err) {
        console.error("Failed to update launch at startup in registry:", err);
      }
      commitUpdate({
        ...cfg,
        island: { ...cfg.island, launchAtStartup: nextVal },
      });
    });

    // Check for updates button
    document.getElementById("btn-check-updates")?.addEventListener("click", () => {
      performUpdateCheck();
    });

    // Install update button
    document.getElementById("btn-start-install")?.addEventListener("click", () => {
      performInstallUpdate();
    });

    // Auto-check updates switch
    const switchAutoUpdate = document.getElementById("switch-autoupdate");
    switchAutoUpdate?.addEventListener("click", () => {
      commitUpdate({
        ...cfg,
        island: { ...cfg.island, autoCheckUpdates: !cfg.island.autoCheckUpdates },
      });
    });
  }

  function bindSegmentGroup(groupId: string, onSelect: (val: string) => void) {
    const group = document.getElementById(groupId);
    if (!group) return;

    // Segment buttons (desktop view)
    const buttons = group.querySelectorAll<HTMLButtonElement>(".m3-segment-btn");
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const val = btn.getAttribute("data-val");
        if (val) onSelect(val);
      });
    });

    // Dropdown select (mobile / narrow window view)
    const select = group.querySelector<HTMLSelectElement>(".m3-select");
    select?.addEventListener("change", () => {
      if (select.value) onSelect(select.value);
    });
  }

  // Listen for background download progress
  listen<UpdateProgress>("update-download-progress", (event) => {
    updateProgress = event.payload;
    if (updateStatus === "downloading") {
      const fill = document.querySelector<HTMLElement>(".update-progress-fill");
      const pct = document.querySelector<HTMLElement>(".update-percent");
      const sub = document.querySelector<HTMLElement>(".update-progress-sub");
      if (fill) fill.style.width = `${updateProgress.percent}%`;
      if (pct) pct.textContent = `${updateProgress.percent}%`;
      if (sub && updateProgress.total_bytes > 0) {
        sub.textContent = `${(updateProgress.downloaded_bytes / (1024 * 1024)).toFixed(1)} MB / ${(updateProgress.total_bytes / (1024 * 1024)).toFixed(1)} MB • Launching installer automatically`;
      }
    }
  }).catch(() => {});

  // Listen for tray trigger
  listen("trigger-update-check", () => {
    performUpdateCheck();
  }).catch(() => {});

  // Initial auto-check if enabled
  if (cfg.island.autoCheckUpdates !== false) {
    performUpdateCheck();
  }

  render();
});
