import { AudioEngine } from "./core/audio";
import { setupMediaSession, updateMediaMetadata } from "./core/media_session";
import { IslandFSM } from "./island/fsm";
import { IslandView } from "./island/view";
import { SearchManager } from "./player/search";
import { PlayerControls } from "./player/controls";
import { renderIcon, renderM3Loader } from "./core/icons";
import {
  loadConfig,
  applyThemeToDOM,
  listenForConfigUpdates,
  AppConfig,
} from "./core/config";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

interface StreamPayload {
  stream_url: string;
}

interface YtDlpStatus {
  installed: boolean;
  path?: string;
  version?: string;
}

window.addEventListener("DOMContentLoaded", async () => {
  const island = document.getElementById("island")!;
  const pill = document.getElementById("island-pill")!;
  const panel = document.getElementById("island-panel")!;

  let currentConfig: AppConfig = loadConfig();
  applyThemeToDOM(currentConfig);

  const glowEl = document.getElementById("island-ambient-glow");
  if (glowEl) {
    if (currentConfig.island.albumCoverBgBlur === false) {
      glowEl.style.display = "none";
    } else {
      glowEl.style.display = "block";
      glowEl.style.backgroundImage = "url('/logo.png')";
    }
  }

  const engine = new AudioEngine();
  const fsm = new IslandFSM();
  const view = new IslandView(island);
  view.updatePhysics(currentConfig.island.springSpeed);
  view.setNotchOffset(currentConfig.island.notchOffsetPx);
  view.setPanelWidth(currentConfig.island.panelWidth);
  view.setCornerRadius(currentConfig.island.cornerRadius);

  // Pass skip forward/backward to OS media session controls
  setupMediaSession(
    engine,
    () => {
      const cur = engine.audio.currentTime || 0;
      const skip = currentConfig.island.skipDurationSecs;
      const dur = engine.audio.duration || cur + skip;
      engine.seek(Math.min(dur, cur + skip));
    },
    () => {
      const cur = engine.audio.currentTime || 0;
      const skip = currentConfig.island.skipDurationSecs;
      engine.seek(Math.max(0, cur - skip));
    }
  );

  let disappearTimer: number | null = null;

  function clearDisappear() {
    if (disappearTimer) {
      clearTimeout(disappearTimer);
      disappearTimer = null;
    }
  }

  function scheduleDisappear() {
    clearDisappear();
    if (currentConfig.island.autoHideSeconds <= 0) return;
    disappearTimer = window.setTimeout(() => {
      // Disappear like Coucou after inactivity
      fsm.hide();
    }, currentConfig.island.autoHideSeconds * 1000);
  }

  const searchManager = new SearchManager();

  function handleCollapse() {
    if (fsm.mode === "panel" || fsm.mode === "panel-search") {
      searchManager.close();
      fsm.collapse(); // transitions to "pill"
      scheduleDisappear();
    }
  }

  fsm.onChange = (mode) => {
    view.setMode(mode);
    syncEqLoop();
    if (mode !== "panel-search") {
      searchManager.close();
    }
    if (mode === "pill") {
      scheduleDisappear();
    } else {
      clearDisappear();
    }
  };
  view.setMode(fsm.mode);

  // Mouse hover over island wakes or cancels disappear
  island.addEventListener("mouseenter", () => {
    clearDisappear();
    if (fsm.mode === "hidden") {
      fsm.expand();
    }
  });

  island.addEventListener("mouseleave", () => {
    if (fsm.mode === "pill") {
      scheduleDisappear();
    }
  });

  // Click on island expands to panel
  island.addEventListener("click", () => {
    clearDisappear();
    if (fsm.mode === "hidden" || fsm.mode === "pill") {
      fsm.expand();
    }
  });

  // Click outside detection: blur event & Tauri Win32 event
  window.addEventListener("blur", () => {
    handleCollapse();
  });

  try {
    listen("click-outside", () => {
      handleCollapse();
    });
    listen("tray-toggle", () => {
      if (fsm.mode === "hidden") {
        fsm.expand();
      } else {
        fsm.hide();
      }
    });
    listen("tray-open", () => {
      fsm.expand();
    });
  } catch {
    // Ignore if running outside Tauri
  }

  // Escape key collapses island
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      searchManager.close();
      if (fsm.mode === "panel-search") {
        fsm.collapseSearch();
      } else {
        handleCollapse();
      }
    }
  });

  // Render Pill content
  pill.innerHTML = `
    <div class="pill-thumb" id="pill-thumb" style="background-image: url('/logo.png');"></div>
    <div class="pill-title" id="pill-title">KitKat Music</div>
    <div class="pill-eq" id="pill-eq">
      <span class="bar"></span><span class="bar"></span>
      <span class="bar"></span><span class="bar"></span>
    </div>
  `;

  function updatePillEqDom(style: "bars" | "wave" | "pulse" | "off") {
    const pillEq = document.getElementById("pill-eq");
    const pillThumb = document.getElementById("pill-thumb");
    if (!pillEq) return;

    if (style === "off") {
      pillEq.style.display = "none";
      pillThumb?.classList.remove("has-pulse");
      return;
    }

    pillEq.style.display = "flex";
    pillEq.className = `pill-eq style-${style}`;

    if (style === "pulse") {
      pillThumb?.classList.add("has-pulse");
      pillEq.innerHTML = `<span class="pulse-orb"></span>`;
    } else {
      pillThumb?.classList.remove("has-pulse");
      pillEq.innerHTML = `
        <span class="bar"></span><span class="bar"></span>
        <span class="bar"></span><span class="bar"></span>
      `;
    }
  }

  updatePillEqDom(currentConfig.island.eqStyle);

  // Render Panel content: Header Search + Settings Button + Search Results + Horizontal Player
  panel.innerHTML = `
    <div class="panel-header">
      <div class="search-bar">
        ${renderIcon("search")}
        <input type="text" id="search-input" placeholder="Search tracks or artists..." autocomplete="off" spellcheck="false" />
        <button id="btn-clear" class="btn-clear">${renderIcon("x")}</button>
      </div>
      <button id="btn-settings-header" class="btn-settings-header" title="Customize KitKat">
        ${renderIcon("settings")}
      </button>
    </div>
    <div id="search-results" class="search-results"></div>
    <div id="player-controls-container"></div>
  `;

  const btnSettings = panel.querySelector("#btn-settings-header") as HTMLButtonElement;
  btnSettings?.addEventListener("click", () => {
    invoke("open_settings").catch((err) => console.error("Failed to open settings:", err));
  });

  const playerContainer = panel.querySelector("#player-controls-container") as HTMLElement;
  const controls = new PlayerControls(engine, playerContainer);
  controls.render();
  controls.applyConfig(currentConfig);

  // Cross-window and local dynamic config updates
  listenForConfigUpdates((newCfg) => {
    currentConfig = newCfg;
    applyThemeToDOM(newCfg);
    view.updatePhysics(newCfg.island.springSpeed);
    view.setNotchOffset(newCfg.island.notchOffsetPx);
    view.setPanelWidth(newCfg.island.panelWidth);
    view.setCornerRadius(newCfg.island.cornerRadius);
    controls.applyConfig(newCfg);
    updatePillEqDom(newCfg.island.eqStyle);
  });

  const searchInput = panel.querySelector("#search-input") as HTMLInputElement;
  const searchResults = panel.querySelector("#search-results") as HTMLElement;
  const searchBar = panel.querySelector(".search-bar") as HTMLElement;
  const clearBtn = panel.querySelector("#btn-clear") as HTMLButtonElement;
  searchManager.setup(searchInput, searchResults, clearBtn, searchBar);

  searchManager.onSearchOpen = () => {
    fsm.expandSearch();
  };

  searchManager.onSearchClose = () => {
    fsm.collapseSearch();
  };

  // Check yt-dlp status on start
  try {
    const status = await invoke<YtDlpStatus>("get_yt_dlp_status");
    if (!status.installed) {
      searchResults.innerHTML = renderM3Loader("Downloading yt-dlp binary...");
      await invoke("install_yt_dlp");
      searchResults.innerHTML = "";
    }
  } catch (err) {
    console.warn("yt-dlp check warning:", err);
  }

  let activeTrackSelectId = 0;

  searchManager.onTrackSelect = async (track) => {
    const selectId = ++activeTrackSelectId;
    try {
      searchResults.innerHTML = renderM3Loader("Resolving audio stream...");
      // Pass `videoId: track.id` matching Tauri camelCase IPC convention
      const stream = await invoke<StreamPayload>("get_stream_url", { videoId: track.id });
      if (selectId !== activeTrackSelectId) return;

      const fullTrack = {
        id: track.id,
        title: track.title,
        artist: track.uploader,
        thumbnailUrl: track.thumbnail_url,
        streamUrl: stream.stream_url,
      };

      await engine.play(fullTrack);
      if (selectId !== activeTrackSelectId) return;

      updateMediaMetadata(fullTrack);
      controls.updateTrackInfo(fullTrack);
      fsm.setPlaying(true);

      // Spring smoothly back to compact panel height
      fsm.collapseSearch();

      const pillTitle = document.getElementById("pill-title");
      if (pillTitle) pillTitle.textContent = `${track.title} • ${track.uploader}`;
      const pillThumb = document.getElementById("pill-thumb");
      if (pillThumb) {
        pillThumb.style.backgroundImage = track.thumbnail_url ? `url('${track.thumbnail_url}')` : "url('/logo.png')";
      }

      // Clear search list once playing
      searchResults.innerHTML = "";
      searchInput.value = "";
      clearBtn.classList.remove("visible");
    } catch (err) {
      if (selectId !== activeTrackSelectId) return;
      console.error("Track play failed:", err);
      const msg = err instanceof Error ? err.message : String(err);
      searchResults.innerHTML = `
        <div class="search-empty-state error">
          <div class="empty-icon-pill error">${renderIcon("wifiOff")}</div>
          <div class="empty-text">
            <div class="empty-title">Playback error</div>
            <div class="empty-sub">${msg}</div>
          </div>
        </div>
      `;
      setTimeout(() => {
        if (fsm.mode === "panel-search" && !searchInput.value.trim() && selectId === activeTrackSelectId) {
          searchResults.innerHTML = "";
          fsm.collapseSearch();
        }
      }, 4000);
    }
  };

  // Adaptive 0% CPU EQ Visualizer Loop for Pill
  let eqRafId: number | null = null;

  function runEqLoop(time: number) {
    if (fsm.mode === "pill" && engine.state === "playing") {
      const style = currentConfig.island.eqStyle;
      if (style === "bars") {
        const bars = engine.getFrequencyBars();
        const barEls = pill.querySelectorAll<HTMLElement>(".bar");
        for (let i = 0; i < barEls.length && i < bars.length; i++) {
          barEls[i].style.transform = `scaleY(${bars[i]})`;
        }
      } else if (style === "wave") {
        const bars = engine.getFrequencyBars();
        const avg = (bars[0] + bars[1] + bars[2] + bars[3]) / 4;
        const barEls = pill.querySelectorAll<HTMLElement>(".bar");
        for (let i = 0; i < barEls.length; i++) {
          const waveFactor = 0.35 + 0.65 * Math.sin(time * 0.007 + i * 1.3);
          const scale = Math.max(0.18, Math.min(1.0, (avg * 0.7 + 0.3) * waveFactor));
          barEls[i].style.transform = `scaleY(${scale})`;
        }
      } else if (style === "pulse") {
        const bars = engine.getFrequencyBars();
        const bass = bars[0] || 0.4;
        const orb = pill.querySelector<HTMLElement>(".pulse-orb");
        if (orb) {
          orb.style.transform = `scale(${0.75 + bass * 0.6})`;
          orb.style.opacity = `${0.5 + bass * 0.5}`;
        }
      }
      eqRafId = requestAnimationFrame(runEqLoop);
    } else {
      resetEqVisuals();
    }
  }

  function resetEqVisuals() {
    if (eqRafId !== null) {
      cancelAnimationFrame(eqRafId);
      eqRafId = null;
    }
    const barEls = pill.querySelectorAll<HTMLElement>(".bar");
    for (let i = 0; i < barEls.length; i++) {
      barEls[i].style.transform = "scaleY(0.2)";
    }
    const orb = pill.querySelector<HTMLElement>(".pulse-orb");
    if (orb) {
      orb.style.transform = "scale(0.8)";
      orb.style.opacity = "0.4";
    }
  }

  function syncEqLoop() {
    if (fsm.mode === "pill" && engine.state === "playing") {
      if (eqRafId === null) {
        eqRafId = requestAnimationFrame(runEqLoop);
      }
    } else {
      resetEqVisuals();
    }
  }

  engine.addStateListener(() => {
    syncEqLoop();
  });

  engine.addEndedListener(() => {
    fsm.setPlaying(false);
    scheduleDisappear();
  });
});
