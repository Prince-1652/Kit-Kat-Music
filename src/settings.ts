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
              ${cfg.island.notchOffsetPx > 0 ? `<span class="preview-notch-indicator">• +${cfg.island.notchOffsetPx}px Notch</span>` : ""}
              <span class="preview-state-indicator" style="font-size: 11px; color: ${previewPlaying ? "var(--kk-primary)" : "var(--kk-text-dim)"}; font-weight: 600;">
                • ${previewPlaying ? "Playing" : "Paused"}
              </span>
            </div>
            <div class="m3-segmented-group">
              <button class="m3-segment-btn ${previewMode === "panel" ? "selected" : ""}" id="btn-mode-panel">Panel View</button>
              <button class="m3-segment-btn ${previewMode === "pill" ? "selected" : ""}" id="btn-mode-pill">Pill View</button>
            </div>
          </div>

          <div class="preview-stage">
            <div class="preview-island-mock ${previewMode === "pill" ? "is-pill is-clickable" : ""}" id="preview-island-mock" title="${previewMode === "pill" ? "Click pill to toggle Play / Pause" : ""}">
              ${
                previewMode === "pill"
                  ? `
                <div class="preview-pill-content">
                  <div class="preview-meta">
                    <div class="preview-thumb ${cfg.island.eqStyle === "pulse" ? "has-pulse" : ""}"></div>
                    <div class="preview-pill-text">Starboy • The Weeknd</div>
                  </div>
                  <div class="preview-eq style-${cfg.island.eqStyle} ${previewPlaying && cfg.island.eqStyle !== "off" ? "animated" : ""}" style="${cfg.island.eqStyle === "off" ? "display: none;" : ""}">
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
              `
                  : `
                <div class="preview-panel-content">
                  <div class="preview-panel-header">
                    <div class="preview-search-mock">
                      ${renderIcon("search")}
                      <span>Search tracks or artists...</span>
                    </div>
                    <div class="preview-settings-btn" title="Customization Settings">
                      ${renderIcon("settings")}
                    </div>
                  </div>

                  <div class="preview-player-row">
                    <div class="preview-art-wrap ${previewPlaying ? "is-playing" : ""}">
                      <img src="/logo.png" class="preview-art-img" alt="Artwork" />
                    </div>
                    <div class="preview-player-body">
                      <div class="preview-track-meta">
                        <div style="display: flex; align-items: baseline; gap: 8px; min-width: 0;">
                          <span class="preview-track-title">Blinding Lights</span>
                          <span class="preview-track-artist">The Weeknd</span>
                        </div>
                        ${
                          cfg.island.showVolumeControl
                            ? `
                        <div class="preview-vol-mock" style="display: flex; align-items: center; gap: 6px; color: var(--kk-text-dim); font-size: 11px;">
                          ${renderIcon("volume2")}
                          <div style="width: 36px; height: 4px; border-radius: 2px; background: var(--kk-surface-variant); overflow: hidden;">
                            <div style="width: 75%; height: 100%; background: var(--kk-primary);"></div>
                          </div>
                        </div>
                        `
                            : ""
                        }
                      </div>

                      <div class="preview-seekbar-row">
                        <span class="preview-time-label" style="${cfg.seekbar.showTimeLabels ? "" : "display: none;"}">
                          ${formatTime(currentTime)}
                        </span>
                        <div class="preview-seekbar-track-container ${isWavy ? "wavy-mode" : ""} ${cfg.seekbar.style === "with-stops" ? "with-stops" : ""}" id="preview-scrubber-track">
                          <div class="preview-seekbar-bg"></div>
                          <div class="preview-seekbar-fill ${wavyClass}" style="width: ${previewScrubPercent}%;">
                            <div class="preview-wavy-flow-inner"></div>
                          </div>
                          <div class="preview-seekbar-thumb-dot" style="left: clamp(7px, ${previewScrubPercent}%, calc(100% - 7px)); ${cfg.seekbar.showThumb ? "" : "display: none;"}"></div>
                        </div>
                        <span class="preview-time-label" style="${cfg.seekbar.showTimeLabels ? "" : "display: none;"}">
                          ${formatTime(totalDuration)}
                        </span>
                      </div>

                      <div class="preview-player-controls-row">
                        <button class="preview-btn-icon" id="btn-prev-step-back">${renderIcon("skipBack")}</button>
                        <button class="preview-play-btn" id="btn-prev-play-toggle">
                          ${renderIcon(previewPlaying ? "pause" : "play")}
                          <span>${previewPlaying ? "Pause" : "Play"}</span>
                        </button>
                        <button class="preview-btn-icon" id="btn-prev-step-fwd">${renderIcon("skipForward")}</button>
                      </div>
                    </div>
                  </div>
                </div>
              `
              }
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
                <div class="setting-title">Glass Effect</div>
                <div class="setting-desc">Frosted glass blur effect, colorful ambient glow, or solid opaque background</div>
              </div>
              ${renderOptionControl(
                "group-surface-material",
                [
                  { val: "acrylic", label: "Frosted Glass" },
                  { val: "ambient", label: "Ambient Glow" },
                  { val: "solid", label: "Solid Dark" },
                ],
                cfg.island.surfaceMaterial
              )}
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
                <div class="setting-title">Bar Thickness</div>
                <div class="setting-desc">Choose how thick the playback line appears</div>
              </div>
              ${renderOptionControl(
                "group-seekbar-height",
                [
                  { val: "4", label: "Thin (4px)" },
                  { val: "8", label: "Medium (8px)" },
                  { val: "12", label: "Thick (12px)" },
                ],
                String(cfg.seekbar.heightPx)
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
                <div class="setting-title">Glow Effect</div>
                <div class="setting-desc">Add a soft neon glow around the active progress bar</div>
              </div>
              <div class="m3-switch ${cfg.seekbar.showHoverGlow ? "active" : ""}" id="switch-glow">
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
                <div class="setting-title">Corner Roundness</div>
                <div class="setting-desc">Adjust how rounded the player corners look</div>
              </div>
              ${renderOptionControl(
                "group-corner-radius",
                [
                  { val: "pill", label: "Pill Round" },
                  { val: "curved", label: "Standard Round" },
                  { val: "compact", label: "Slight Round" },
                ],
                cfg.island.cornerRadius
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
                <div class="setting-desc">Show the volume slider directly in the player header</div>
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
                <div class="setting-title">Top Screen Spacing</div>
                <div class="setting-desc">Spacing below the top edge of your monitor or camera notch</div>
              </div>
              ${renderOptionControl(
                "group-notch",
                [
                  { val: "0", label: "Top Edge (0px)" },
                  { val: "4", label: "Small Gap (4px)" },
                  { val: "8", label: "Larger Gap (8px)" },
                ],
                String(cfg.island.notchOffsetPx)
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
                  Installed: <strong class="version-tag">v${updateData?.current_version || "0.1.0"}</strong>
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
    const previewIslandMock = document.getElementById("preview-island-mock");
    if (previewIslandMock && previewMode === "pill") {
      previewIslandMock.addEventListener("click", () => {
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

    // Surface material (responsive segmented / select)
    bindSegmentGroup("group-surface-material", (val) => {
      commitUpdate({
        ...cfg,
        island: { ...cfg.island, surfaceMaterial: val as "acrylic" | "solid" | "ambient" },
      });
    });

    // Seekbar style (responsive segmented / select)
    bindSegmentGroup("group-seekbar-style", (val) => {
      commitUpdate({
        ...cfg,
        seekbar: { ...cfg.seekbar, style: val as SeekbarStyle },
      });
    });

    // Seekbar height (responsive segmented / select)
    bindSegmentGroup("group-seekbar-height", (val) => {
      commitUpdate({
        ...cfg,
        seekbar: { ...cfg.seekbar, heightPx: parseInt(val, 10) as 4 | 8 | 12 },
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

    // Switch glow
    const switchGlow = document.getElementById("switch-glow");
    switchGlow?.addEventListener("click", () => {
      commitUpdate({
        ...cfg,
        seekbar: { ...cfg.seekbar, showHoverGlow: !cfg.seekbar.showHoverGlow },
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

    // Corner geometry (responsive segmented / select)
    bindSegmentGroup("group-corner-radius", (val) => {
      commitUpdate({
        ...cfg,
        island: { ...cfg.island, cornerRadius: val as "pill" | "curved" | "compact" },
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

    // Notch (responsive segmented / select)
    bindSegmentGroup("group-notch", (val) => {
      commitUpdate({
        ...cfg,
        island: { ...cfg.island, notchOffsetPx: parseInt(val, 10) },
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
