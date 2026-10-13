import { renderIcon } from "../core/icons";
import type { AudioEngine, AudioTrack } from "../core/audio";
import type { AppConfig } from "../core/config";

export class PlayerControls {
  private isScrubbing = false;
  private skipDuration = 10;
  private showThumb = true;

  constructor(
    private engine: AudioEngine,
    private container: HTMLElement
  ) {}

  applyConfig(cfg: AppConfig): void {
    this.skipDuration = cfg.island.skipDurationSecs;
    this.showThumb = cfg.seekbar.showThumb;
    const timeCur = this.container.querySelector("#time-current") as HTMLElement;
    const timeTot = this.container.querySelector("#time-total") as HTMLElement;
    if (timeCur && timeTot) {
      const display = cfg.seekbar.showTimeLabels ? "block" : "none";
      timeCur.style.display = display;
      timeTot.style.display = display;
    }
    const fill = this.container.querySelector("#seekbar-fill") as HTMLElement;
    if (fill) {
      fill.classList.remove("m3-wavy-animated", "m3-wavy-still");
      if (cfg.seekbar.style === "wavy-animated") {
        fill.classList.add("m3-wavy-animated");
      } else if (cfg.seekbar.style === "wavy-still") {
        fill.classList.add("m3-wavy-still");
      }
    }
    const thumbDot = this.container.querySelector("#seekbar-thumb-dot") as HTMLElement;
    if (thumbDot) {
      thumbDot.style.display = this.showThumb ? "block" : "none";
    }
    const trackContainer = this.container.querySelector(".seekbar-track-container") as HTMLElement;
    if (trackContainer) {
      trackContainer.classList.toggle("with-stops", cfg.seekbar.style === "with-stops");
      trackContainer.classList.toggle("wavy-mode", cfg.seekbar.style === "wavy-animated" || cfg.seekbar.style === "wavy-still");
    }
    const volGroup = this.container.querySelector(".vol-group") as HTMLElement;
    if (volGroup) {
      volGroup.style.display = cfg.island.showVolumeControl === false ? "none" : "flex";
    }
  }

  render(): void {
    this.container.innerHTML = `
      <div class="player-main">
        <div class="album-art-wrap" id="player-art-wrap">
          <img id="player-art" src="" style="display:none;" />
          <div id="art-placeholder"><img src="/logo.png" class="placeholder-logo" alt="KitKat" /></div>
        </div>
        <div class="player-details">
          <div class="details-header">
            <div class="track-text">
              <div class="track-title" id="track-title">KitKat Music</div>
              <div class="track-artist" id="track-artist">Search music to play</div>
            </div>
            <div class="vol-group">
              <button id="btn-vol" class="btn-icon" title="Mute/Unmute">${renderIcon("volume2")}</button>
              <input type="range" id="vol-slider" class="vol-slider" min="0" max="1" step="0.05" value="1" />
            </div>
          </div>
          <div class="seekbar-row" id="seekbar-row">
            <span class="time-label" id="time-current">0:00</span>
            <div class="seekbar-track-container">
              <div class="seekbar-track-bg"></div>
              <div class="seekbar-fill" id="seekbar-fill"><div class="wavy-flow-inner"></div></div>
              <div class="seekbar-thumb-dot" id="seekbar-thumb-dot"></div>
              <input type="range" id="scrubber" class="thick-seekbar" min="0" max="100" value="0" />
            </div>
            <span class="time-label" id="time-total">0:00</span>
          </div>
          <div class="controls-bottom-row">
            <button id="btn-prev" class="btn-icon">${renderIcon("skipBack")}</button>
            <button id="btn-play" class="btn-play-pill">${renderIcon("play")}<span class="play-label">Play</span></button>
            <button id="btn-next" class="btn-icon">${renderIcon("skipForward")}</button>
          </div>
        </div>
      </div>
    `;

    const playBtn = this.container.querySelector("#btn-play") as HTMLButtonElement;
    playBtn.addEventListener("click", () => {
      if (this.engine.state === "playing") {
        this.engine.pause();
      } else if (this.engine.audio.src) {
        this.engine.resume();
      } else {
        const searchInput = document.getElementById("search-input") as HTMLInputElement;
        searchInput?.focus();
      }
    });

    const prevBtn = this.container.querySelector("#btn-prev") as HTMLButtonElement;
    prevBtn?.addEventListener("click", () => {
      const cur = this.engine.audio.currentTime || 0;
      this.engine.seek(Math.max(0, cur - this.skipDuration));
    });

    const nextBtn = this.container.querySelector("#btn-next") as HTMLButtonElement;
    nextBtn?.addEventListener("click", () => {
      const cur = this.engine.audio.currentTime || 0;
      const dur = this.engine.audio.duration || cur + this.skipDuration;
      this.engine.seek(Math.min(dur, cur + this.skipDuration));
    });

    const scrubber = this.container.querySelector("#scrubber") as HTMLInputElement;
    const seekbarFill = this.container.querySelector("#seekbar-fill") as HTMLElement;
    const thumbDot = this.container.querySelector("#seekbar-thumb-dot") as HTMLElement;
    const timeCur = this.container.querySelector("#time-current") as HTMLElement;
    const timeTot = this.container.querySelector("#time-total") as HTMLElement;
    const seekbarRow = this.container.querySelector("#seekbar-row") as HTMLElement;

    const updateSeekbar = (val: number) => {
      if (seekbarFill) {
        seekbarFill.style.width = `${val}%`;
        seekbarFill.style.display = "block";
      }
      if (thumbDot) {
        thumbDot.style.left = `${val}%`;
        thumbDot.style.display = this.showThumb ? "block" : "none";
      }
    };
    updateSeekbar(0);

    const commitSeek = () => {
      if (!this.isScrubbing) return;
      this.isScrubbing = false;
      seekbarRow?.classList.remove("is-scrubbing");
      const targetTime = (parseFloat(scrubber.value) / 100) * (this.engine.audio.duration || 0);
      this.engine.seek(targetTime);
    };

    scrubber.addEventListener("pointerdown", () => {
      this.isScrubbing = true;
      seekbarRow?.classList.add("is-scrubbing");
    });
    scrubber.addEventListener("pointerup", commitSeek);
    scrubber.addEventListener("change", commitSeek);
    window.addEventListener("pointerup", () => {
      if (this.isScrubbing) commitSeek();
    });

    scrubber.addEventListener("input", () => {
      const val = parseFloat(scrubber.value);
      updateSeekbar(val);
      const cur = (val / 100) * (this.engine.audio.duration || 0);
      timeCur.textContent = this.formatTime(cur);
    });

    const volSlider = this.container.querySelector("#vol-slider") as HTMLInputElement;
    const volBtn = this.container.querySelector("#btn-vol") as HTMLButtonElement;
    const updateVolGradient = (val: number) => {
      const pct = Math.round(val * 100);
      volSlider.style.background = `linear-gradient(to right, var(--kk-text-dim) ${pct}%, rgba(255, 255, 255, 0.12) ${pct}%)`;
    };
    updateVolGradient(1);

    volSlider.addEventListener("input", () => {
      const val = parseFloat(volSlider.value);
      this.engine.setVolume(val);
      updateVolGradient(val);
      volBtn.innerHTML = renderIcon(val === 0 ? "volumeX" : "volume2");
    });
    volBtn.addEventListener("click", () => {
      if (this.engine.audio.volume > 0) {
        this.engine.setVolume(0);
        volSlider.value = "0";
        updateVolGradient(0);
        volBtn.innerHTML = renderIcon("volumeX");
      } else {
        this.engine.setVolume(1);
        volSlider.value = "1";
        updateVolGradient(1);
        volBtn.innerHTML = renderIcon("volume2");
      }
    });

    this.engine.addStateListener((state) => {
      const isPlaying = state === "playing";
      playBtn.innerHTML = `${renderIcon(isPlaying ? "pause" : "play")}<span class="play-label">${isPlaying ? "Pause" : "Play"}</span>`;
      const artWrap = this.container.querySelector("#player-art-wrap");
      if (artWrap) {
        artWrap.classList.toggle("is-playing", isPlaying);
      }
      if (state === "idle" && !this.isScrubbing) {
        scrubber.value = "0";
        updateSeekbar(0);
        timeCur.textContent = "0:00";
      }
    });

    this.engine.addTimeListener((current, duration) => {
      if (!this.isScrubbing && duration > 0) {
        const pct = (current / duration) * 100;
        scrubber.value = pct.toString();
        updateSeekbar(pct);
        timeCur.textContent = this.formatTime(current);
        timeTot.textContent = this.formatTime(duration);
      }
    });
  }

  updateTrackInfo(track: AudioTrack): void {
    const titleEl = this.container.querySelector("#track-title");
    const artistEl = this.container.querySelector("#track-artist");
    const artImg = this.container.querySelector("#player-art") as HTMLImageElement;
    const placeholder = this.container.querySelector("#art-placeholder") as HTMLElement;
    const artWrap = this.container.querySelector("#player-art-wrap");

    if (artWrap) {
      artWrap.classList.toggle("is-playing", this.engine.state === "playing");
    }

    if (titleEl) titleEl.textContent = track.title;
    if (artistEl) artistEl.textContent = track.artist;
    if (artImg) {
      if (track.thumbnailUrl) {
        artImg.src = track.thumbnailUrl;
        artImg.style.display = "block";
        if (placeholder) placeholder.style.display = "none";
      } else {
        artImg.style.display = "none";
        if (placeholder) placeholder.style.display = "block";
      }
    }
  }

  private formatTime(secs: number): string {
    if (!Number.isFinite(secs) || secs < 0) return "0:00";
    const totalSecs = Math.floor(secs);
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    const sStr = s < 10 ? `0${s}` : `${s}`;
    if (h > 0) {
      const mStr = m < 10 ? `0${m}` : `${m}`;
      return `${h}:${mStr}:${sStr}`;
    }
    return `${m}:${sStr}`;
  }
}
