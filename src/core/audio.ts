export interface AudioTrack {
  id: string;
  title: string;
  artist: string;
  thumbnailUrl?: string;
  durationSecs?: number;
  streamUrl: string;
}

export type PlaybackState = "idle" | "buffering" | "playing" | "paused" | "error";

export class AudioEngine {
  readonly audio = new Audio();
  currentTrack: AudioTrack | null = null;
  state: PlaybackState = "idle";
  onStateChange?: (state: PlaybackState) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;

  constructor() {
    this.audio.preload = "auto";

    this.audio.addEventListener("playing", () => this.setState("playing"));
    this.audio.addEventListener("pause", () => this.setState("paused"));
    this.audio.addEventListener("waiting", () => this.setState("buffering"));
    this.audio.addEventListener("timeupdate", () => {
      this.onTimeUpdate?.(this.audio.currentTime, this.audio.duration || 0);
    });
    this.audio.addEventListener("error", (e) => {
      console.error("Audio error event:", this.audio.error, e);
      this.setState("error");
    });
  }

  async play(track: AudioTrack): Promise<void> {
    this.currentTrack = track;
    this.audio.src = track.streamUrl;
    this.setState("buffering");
    try {
      await this.audio.play();
    } catch (err) {
      this.setState("error");
      throw err;
    }
  }

  pause(): void {
    this.audio.pause();
  }

  resume(): void {
    if (this.audio.src) {
      this.audio.play().catch(() => this.setState("error"));
    }
  }

  seek(seconds: number): void {
    if (Number.isFinite(seconds)) {
      this.audio.currentTime = seconds;
    }
  }

  setVolume(fraction: number): void {
    this.audio.volume = Math.max(0, Math.min(1, fraction));
  }

  getFrequencyBars(): number[] {
    if (this.state !== "playing") {
      return [0.15, 0.15, 0.15, 0.15];
    }
    const t = this.audio.currentTime * 10;
    return [
      0.2 + 0.7 * Math.abs(Math.sin(t * 0.8)),
      0.25 + 0.75 * Math.abs(Math.sin(t * 1.3 + 1.2)),
      0.3 + 0.65 * Math.abs(Math.cos(t * 1.7 + 0.5)),
      0.2 + 0.6 * Math.abs(Math.sin(t * 2.2 + 2.1)),
    ];
  }

  private setState(state: PlaybackState): void {
    this.state = state;
    this.onStateChange?.(state);
  }
}
