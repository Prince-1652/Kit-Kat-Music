import { renderIcon } from "../core/icons";
import type { AudioEngine, AudioTrack } from "../core/audio";

export class PlayerControls {
  private isScrubbing = false;

  constructor(
    private engine: AudioEngine,
    private container: HTMLElement,
    private heroContainer: HTMLElement
  ) {}

  render(): void {
    this.container.innerHTML = `
      <div class="scrubber-group">
        <input type="range" id="scrubber" class="scrubber-slider" min="0" max="100" value="0" />
        <div class="scrubber-times">
          <span id="time-current">0:00</span>
          <span id="time-total">0:00</span>
        </div>
      </div>
      <div class="controls-row">
        <div class="controls-main">
          <button id="btn-prev" class="btn-icon">${renderIcon("skipBack")}</button>
          <button id="btn-play" class="btn-fab">${renderIcon("play")}</button>
          <button id="btn-next" class="btn-icon">${renderIcon("skipForward")}</button>
        </div>
        <div class="vol-group">
          <button id="btn-vol" class="btn-icon">${renderIcon("volume2")}</button>
          <input type="range" id="vol-slider" class="vol-slider" min="0" max="1" step="0.05" value="1" />
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

    const scrubber = this.container.querySelector("#scrubber") as HTMLInputElement;
    const timeCur = this.container.querySelector("#time-current") as HTMLElement;
    const timeTot = this.container.querySelector("#time-total") as HTMLElement;

    scrubber.addEventListener("mousedown", () => { this.isScrubbing = true; });
    scrubber.addEventListener("mouseup", () => {
      this.isScrubbing = false;
      const targetTime = (parseFloat(scrubber.value) / 100) * (this.engine.audio.duration || 0);
      this.engine.seek(targetTime);
    });
    scrubber.addEventListener("input", () => {
      const cur = (parseFloat(scrubber.value) / 100) * (this.engine.audio.duration || 0);
      timeCur.textContent = this.formatTime(cur);
    });

    const volSlider = this.container.querySelector("#vol-slider") as HTMLInputElement;
    const volBtn = this.container.querySelector("#btn-vol") as HTMLButtonElement;
    volSlider.addEventListener("input", () => {
      const val = parseFloat(volSlider.value);
      this.engine.setVolume(val);
      volBtn.innerHTML = renderIcon(val === 0 ? "volumeX" : "volume2");
    });
    volBtn.addEventListener("click", () => {
      if (this.engine.audio.volume > 0) {
        this.engine.setVolume(0);
        volSlider.value = "0";
        volBtn.innerHTML = renderIcon("volumeX");
      } else {
        this.engine.setVolume(1);
        volSlider.value = "1";
        volBtn.innerHTML = renderIcon("volume2");
      }
    });

    this.engine.onStateChange = (state) => {
      playBtn.innerHTML = renderIcon(state === "playing" ? "pause" : "play");
    };

    this.engine.onTimeUpdate = (current, duration) => {
      if (!this.isScrubbing && duration > 0) {
        scrubber.value = ((current / duration) * 100).toString();
        timeCur.textContent = this.formatTime(current);
        timeTot.textContent = this.formatTime(duration);
      }
    };
  }

  updateHero(track: AudioTrack): void {
    this.heroContainer.innerHTML = `
      <div class="hero-player">
        <img src="${track.thumbnailUrl || ""}" class="hero-thumb" onerror="this.style.display='none'" />
        <div class="hero-meta">
          <div class="hero-title">${track.title}</div>
          <div class="hero-artist">${track.artist}</div>
        </div>
      </div>
    `;
  }

  private formatTime(secs: number): string {
    if (!Number.isFinite(secs) || secs < 0) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  }
}
