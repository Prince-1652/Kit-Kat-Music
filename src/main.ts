import { AudioEngine } from "./core/audio";
import { setupMediaSession, updateMediaMetadata } from "./core/media_session";
import { IslandFSM } from "./island/fsm";
import { IslandView } from "./island/view";
import { SearchManager } from "./player/search";
import { PlayerControls } from "./player/controls";
import { renderIcon } from "./core/icons";
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

  const engine = new AudioEngine();
  const fsm = new IslandFSM();
  const view = new IslandView(island);

  setupMediaSession(engine);

  let disappearTimer: number | null = null;

  function clearDisappear() {
    if (disappearTimer) {
      clearTimeout(disappearTimer);
      disappearTimer = null;
    }
  }

  function scheduleDisappear() {
    clearDisappear();
    disappearTimer = window.setTimeout(() => {
      // Disappear like Coucou after 10s of inactivity
      fsm.hide();
    }, 10000);
  }

  function handleCollapse() {
    if (fsm.mode === "panel" || fsm.mode === "panel-search") {
      fsm.collapse(); // transitions to "pill"
      scheduleDisappear();
    }
  }

  fsm.onChange = (mode) => {
    view.setMode(mode);
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
  } catch {
    // Ignore if running outside Tauri
  }

  // Escape key collapses island
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (fsm.mode === "panel-search") {
        fsm.collapseSearch();
      } else {
        handleCollapse();
      }
    }
  });

  // Render Pill content
  pill.innerHTML = `
    <div class="pill-thumb" id="pill-thumb">${renderIcon("play")}</div>
    <div class="pill-title" id="pill-title">KitKat Music</div>
    <div class="pill-eq">
      <span class="bar"></span><span class="bar"></span>
      <span class="bar"></span><span class="bar"></span>
    </div>
  `;

  // Render Panel content: Header Search + Search Results + Horizontal Player
  panel.innerHTML = `
    <div class="panel-header">
      <div class="search-bar">
        ${renderIcon("search")}
        <input type="text" id="search-input" placeholder="Search tracks or artists..." />
        <button id="btn-clear" class="btn-clear" title="Clear search">${renderIcon("x")}</button>
      </div>
    </div>
    <div id="search-results" class="search-results"></div>
    <div id="player-controls-container"></div>
  `;

  const playerContainer = panel.querySelector("#player-controls-container") as HTMLElement;
  const controls = new PlayerControls(engine, playerContainer);
  controls.render();

  const searchManager = new SearchManager();
  const searchInput = panel.querySelector("#search-input") as HTMLInputElement;
  const searchResults = panel.querySelector("#search-results") as HTMLElement;
  const clearBtn = panel.querySelector("#btn-clear") as HTMLButtonElement;
  searchManager.setup(searchInput, searchResults, clearBtn);

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
      searchResults.innerHTML = `<div class="search-loading">${renderIcon("loader2")} Downloading yt-dlp binary...</div>`;
      await invoke("install_yt_dlp");
      searchResults.innerHTML = "";
    }
  } catch (err) {
    console.warn("yt-dlp check warning:", err);
  }

  searchManager.onTrackSelect = async (track) => {
    try {
      searchResults.innerHTML = `<div class="search-loading">${renderIcon("loader2")} Resolving audio stream...</div>`;
      // FIXED: pass `videoId: track.id` matching Tauri camelCase IPC convention
      const stream = await invoke<StreamPayload>("get_stream_url", { videoId: track.id });
      const fullTrack = {
        id: track.id,
        title: track.title,
        artist: track.uploader,
        thumbnailUrl: track.thumbnail_url,
        streamUrl: stream.stream_url,
      };

      await engine.play(fullTrack);
      updateMediaMetadata(fullTrack);
      controls.updateTrackInfo(fullTrack);
      fsm.setPlaying(true);

      // Spring smoothly back to compact panel height (160px)
      fsm.collapseSearch();

      const pillTitle = document.getElementById("pill-title");
      if (pillTitle) pillTitle.textContent = `${track.title} • ${track.uploader}`;
      const pillThumb = document.getElementById("pill-thumb");
      if (pillThumb) {
        if (track.thumbnail_url) {
          pillThumb.style.backgroundImage = `url('${track.thumbnail_url}')`;
          pillThumb.innerHTML = "";
        }
      }

      // Clear search list once playing
      searchResults.innerHTML = "";
      searchInput.value = "";
      clearBtn.classList.remove("visible");
    } catch (err) {
      searchResults.innerHTML = `<div class="search-error">${renderIcon("wifiOff")} Stream error: ${err}</div>`;
    }
  };

  // 60fps EQ Animation loop for Pill
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
