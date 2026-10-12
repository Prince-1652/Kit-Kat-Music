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
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private freqData = new Uint8Array(16);

  currentTrack: AudioTrack | null = null;
  state: PlaybackState = "idle";
  onStateChange?: (state: PlaybackState) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;

  constructor() {
    this.audio.crossOrigin = "anonymous";
    this.audio.preload = "auto";

    this.audio.addEventListener("playing", () => this.setState("playing"));
    this.audio.addEventListener("pause", () => this.setState("paused"));
    this.audio.addEventListener("waiting", () => this.setState("buffering"));
    this.audio.addEventListener("timeupdate", () => {
      this.onTimeUpdate?.(this.audio.currentTime, this.audio.duration || 0);
    });
    this.audio.addEventListener("error", () => this.setState("error"));
  }

  private initAudioContext(): void {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 32;
    this.freqData = new Uint8Array(this.analyser.frequencyBinCount);

    try {
      this.source = this.ctx.createMediaElementSource(this.audio);
      this.source.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    } catch {
      // Fallback if cross-origin source cannot connect to audio graph
    }
  }

  async play(track: AudioTrack): Promise<void> {
    this.initAudioContext();
    if (this.ctx?.state === "suspended") {
      await this.ctx.resume();
    }

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
      if (this.ctx?.state === "suspended") {
        this.ctx.resume();
      }
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
    if (!this.analyser || this.state !== "playing") {
      return [0.2, 0.2, 0.2, 0.2];
    }
    this.analyser.getByteFrequencyData(this.freqData);
    return [
      Math.max(0.15, this.freqData[1] / 255),
      Math.max(0.15, this.freqData[3] / 255),
      Math.max(0.15, this.freqData[6] / 255),
      Math.max(0.15, this.freqData[10] / 255),
    ];
  }

  private setState(state: PlaybackState): void {
    this.state = state;
    this.onStateChange?.(state);
  }
}
