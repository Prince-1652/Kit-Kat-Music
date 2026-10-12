import { renderIcon } from "../core/icons";
import type { AudioEngine, AudioTrack } from "../core/audio";

export class PlayerControls {
  private isScrubbing = false;

  constructor(
    private engine: AudioEngine,
    private container: HTMLElement
  ) {}

  render(): void {
    this.container.innerHTML = `
      <div class="player-main">
        <div class="album-art-wrap" id="player-art-wrap">
          <img id="player-art" src="" style="display:none;" />
          <div id="art-placeholder" style="color:var(--kk-primary);">${renderIcon("play")}</div>
        </div>
        <div class="player-details">
          <div class="details-header">
            <div class="track-text">
              <div class="track-title" id="track-title">KitKat Music</div>
              <div class="track-artist" id="track-artist">Select track to play</div>
            </div>
            <div class="vol-group">
              <button id="btn-vol" class="btn-icon" title="Mute/Unmute">${renderIcon("volume2")}</button>
              <input type="range" id="vol-slider" class="vol-slider" min="0" max="1" step="0.05" value="1" />
            </div>
          </div>
          <div class="seekbar-row">
            <span class="time-label" id="time-current">0:00</span>
            <div class="seekbar-track-container">
              <input type="range" id="scrubber" class="thick-seekbar" min="0" max="100" value="0" />
            </div>
            <span class="time-label" id="time-total">0:00</span>
          </div>
          <div class="controls-bottom-row">
            <button id="btn-prev" class="btn-icon" title="Previous">${renderIcon("skipBack")}</button>
            <button id="btn-play" class="btn-fab" title="Play/Pause">${renderIcon("play")}</button>
            <button id="btn-next" class="btn-icon" title="Next">${renderIcon("skipForward")}</button>
          </div>
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

    const prevBtn = this.container.querySelector("#btn-prev") as HTMLButtonElement;
    prevBtn?.addEventListener("click", () => {
      const cur = this.engine.audio.currentTime || 0;
      this.engine.seek(Math.max(0, cur - 10));
    });

    const nextBtn = this.container.querySelector("#btn-next") as HTMLButtonElement;
    nextBtn?.addEventListener("click", () => {
      const cur = this.engine.audio.currentTime || 0;
      const dur = this.engine.audio.duration || cur + 10;
      this.engine.seek(Math.min(dur, cur + 10));
    });

    const scrubber = this.container.querySelector("#scrubber") as HTMLInputElement;
    const timeCur = this.container.querySelector("#time-current") as HTMLElement;
    const timeTot = this.container.querySelector("#time-total") as HTMLElement;

    const updateSeekbarGradient = (val: number) => {
      scrubber.style.background = `linear-gradient(to right, var(--kk-primary) ${val}%, var(--kk-surface) ${val}%)`;
    };
    updateSeekbarGradient(0);

    scrubber.addEventListener("mousedown", () => { this.isScrubbing = true; });
    scrubber.addEventListener("mouseup", () => {
      this.isScrubbing = false;
      const targetTime = (parseFloat(scrubber.value) / 100) * (this.engine.audio.duration || 0);
      this.engine.seek(targetTime);
    });
    scrubber.addEventListener("input", () => {
      const val = parseFloat(scrubber.value);
      updateSeekbarGradient(val);
      const cur = (val / 100) * (this.engine.audio.duration || 0);
      timeCur.textContent = this.formatTime(cur);
    });

    const volSlider = this.container.querySelector("#vol-slider") as HTMLInputElement;
    const volBtn = this.container.querySelector("#btn-vol") as HTMLButtonElement;
    const updateVolGradient = (val: number) => {
      const pct = Math.round(val * 100);
      volSlider.style.background = `linear-gradient(to right, var(--kk-text-dim) ${pct}%, var(--kk-surface) ${pct}%)`;
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

    this.engine.onStateChange = (state) => {
      playBtn.innerHTML = renderIcon(state === "playing" ? "pause" : "play");
    };

    this.engine.onTimeUpdate = (current, duration) => {
      if (!this.isScrubbing && duration > 0) {
        const pct = (current / duration) * 100;
        scrubber.value = pct.toString();
        updateSeekbarGradient(pct);
        timeCur.textContent = this.formatTime(current);
        timeTot.textContent = this.formatTime(duration);
      }
    };
  }

  updateTrackInfo(track: AudioTrack): void {
    const titleEl = this.container.querySelector("#track-title");
    const artistEl = this.container.querySelector("#track-artist");
    const artImg = this.container.querySelector("#player-art") as HTMLImageElement;
    const placeholder = this.container.querySelector("#art-placeholder") as HTMLElement;

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
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  }
}
