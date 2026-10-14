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

  private stateListeners = new Set<(state: PlaybackState) => void>();
  private timeListeners = new Set<(current: number, duration: number) => void>();
  private endedListeners = new Set<() => void>();

  onStateChange?: (state: PlaybackState) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;

  constructor() {
    this.audio.preload = "auto";

    this.audio.addEventListener("playing", () => this.setState("playing"));
    this.audio.addEventListener("pause", () => this.setState("paused"));
    this.audio.addEventListener("waiting", () => this.setState("buffering"));
    this.audio.addEventListener("timeupdate", () => {
      const cur = this.audio.currentTime || 0;
      const dur = this.audio.duration || 0;
      this.onTimeUpdate?.(cur, dur);
      for (const listener of this.timeListeners) {
        listener(cur, dur);
      }
    });
    this.audio.addEventListener("ended", () => {
      this.setState("idle");
      this.onEnded?.();
      for (const listener of this.endedListeners) {
        listener();
      }
    });
    this.audio.addEventListener("error", (e) => {
      console.error("Audio error event:", this.audio.error, e);
      this.setState("error");
    });
  }

  addStateListener(fn: (state: PlaybackState) => void): () => void {
    this.stateListeners.add(fn);
    return () => this.stateListeners.delete(fn);
  }

  addTimeListener(fn: (current: number, duration: number) => void): () => void {
    this.timeListeners.add(fn);
    return () => this.timeListeners.delete(fn);
  }

  addEndedListener(fn: () => void): () => void {
    this.endedListeners.add(fn);
    return () => this.endedListeners.delete(fn);
  }

  async play(track: AudioTrack): Promise<void> {
    this.currentTrack = track;
    this.audio.pause();
    this.audio.src = track.streamUrl;
    this.audio.load();
    this.setState("buffering");
    try {
      await this.audio.play();
    } catch (err) {
      console.error("Play failed:", err, "src:", track.streamUrl?.substring(0, 80));
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
    if (Number.isFinite(seconds) && this.audio.src) {
      try {
        const hasDur = Number.isFinite(this.audio.duration) && this.audio.duration > 0;
        const max = hasDur ? this.audio.duration : seconds;
        this.audio.currentTime = Math.max(0, Math.min(max, seconds));
      } catch {
        // Ignore seek error if media element is not in ready state yet
      }
    }
  }

  setVolume(fraction: number): void {
    this.audio.volume = Math.max(0, Math.min(1, fraction));
  }

  getFrequencyBars(): number[] {
    if (this.state !== "playing") {
      return [0.15, 0.15, 0.15, 0.15];
    }
    const t = (this.audio.currentTime || 0) * 10;
    return [
      0.2 + 0.7 * Math.abs(Math.sin(t * 0.8)),
      0.25 + 0.75 * Math.abs(Math.sin(t * 1.3 + 1.2)),
      0.3 + 0.65 * Math.abs(Math.cos(t * 1.7 + 0.5)),
      0.2 + 0.6 * Math.abs(Math.sin(t * 2.2 + 2.1)),
    ];
  }

  private setState(state: PlaybackState): void {
    if (this.state === state) return;
    this.state = state;
    this.onStateChange?.(state);
    for (const listener of this.stateListeners) {
      listener(state);
    }
  }
}
