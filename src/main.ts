import { AudioEngine } from "./core/audio";
import { setupMediaSession, updateMediaMetadata } from "./core/media_session";
import { IslandFSM } from "./island/fsm";
import { IslandView } from "./island/view";
import { SearchManager } from "./player/search";
import { PlayerControls } from "./player/controls";
import { renderIcon } from "./core/icons";
import { invoke } from "@tauri-apps/api/core";

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

  fsm.onChange = (mode) => view.setMode(mode);
  view.setMode(fsm.mode);

  // Click on island expands to panel if not already open
  island.addEventListener("click", () => {
    if (fsm.mode !== "panel") {
      fsm.expand();
    }
  });

  // Escape key collapses island
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") fsm.collapse();
  });

  // Render Pill content
  pill.innerHTML = `
    <div class="pill-thumb" id="pill-thumb"></div>
    <div class="pill-title" id="pill-title">KitKat Music</div>
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
        <input type="text" id="search-input" placeholder="Search tracks or artists..." />
        <button id="btn-clear" class="btn-icon" title="Clear">${renderIcon("x")}</button>
      </div>
      <button id="btn-collapse" class="btn-icon" title="Minimize">${renderIcon("chevronUp")}</button>
    </div>
    <div id="hero-container"></div>
    <div id="search-results" class="search-results"></div>
    <div id="player-controls" class="player-controls"></div>
  `;

  const collapseBtn = panel.querySelector("#btn-collapse") as HTMLButtonElement;
  collapseBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    fsm.collapse();
  });

  const heroContainer = panel.querySelector("#hero-container") as HTMLElement;
  const controls = new PlayerControls(engine, panel.querySelector("#player-controls")!, heroContainer);
  controls.render();

  const searchManager = new SearchManager();
  const searchInput = panel.querySelector("#search-input") as HTMLInputElement;
  const searchResults = panel.querySelector("#search-results") as HTMLElement;
  const clearBtn = panel.querySelector("#btn-clear") as HTMLButtonElement;
  searchManager.setup(searchInput, searchResults, clearBtn);

  // Check yt-dlp status on start
  try {
    const status = await invoke<YtDlpStatus>("get_yt_dlp_status");
    if (!status.installed) {
      searchResults.innerHTML = `<div class="search-loading">${renderIcon("loader2")} Installing yt-dlp binary...</div>`;
      await invoke("install_yt_dlp");
      searchResults.innerHTML = `<div class="search-empty">Ready! Type in search bar to play music.</div>`;
    }
  } catch (err) {
    console.warn("yt-dlp check warning:", err);
  }

  searchManager.onTrackSelect = async (track) => {
    try {
      searchResults.innerHTML = `<div class="search-loading">${renderIcon("loader2")} Resolving audio stream...</div>`;
      const stream = await invoke<StreamPayload>("get_stream_url", { video_id: track.id });
      const fullTrack = {
        id: track.id,
        title: track.title,
        artist: track.uploader,
        thumbnailUrl: track.thumbnail_url,
        streamUrl: stream.stream_url,
      };

      await engine.play(fullTrack);
      updateMediaMetadata(fullTrack);
      controls.updateHero(fullTrack);
      fsm.setPlaying(true);

      const pillTitle = document.getElementById("pill-title");
      if (pillTitle) pillTitle.textContent = `${track.title} • ${track.uploader}`;
      const pillThumb = document.getElementById("pill-thumb");
      if (pillThumb && track.thumbnail_url) {
        pillThumb.style.backgroundImage = `url('${track.thumbnail_url}')`;
      }

      // Clear search list once playing
      searchResults.innerHTML = "";
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
