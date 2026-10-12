export type IslandMode = "hidden" | "pill" | "panel";

export class IslandFSM {
  private current: IslandMode = "hidden";
  private isMusicPlaying = false;
  onChange?: (mode: IslandMode, prev: IslandMode) => void;

  get mode(): IslandMode {
    return this.current;
  }

  setPlaying(playing: boolean): void {
    this.isMusicPlaying = playing;
    if (this.current !== "panel") {
      this.transition(playing ? "pill" : "hidden");
    }
  }

  expand(): void {
    this.transition("panel");
  }

  collapse(): void {
    this.transition(this.isMusicPlaying ? "pill" : "hidden");
  }

  toggle(): void {
    if (this.current === "panel") {
      this.collapse();
    } else {
      this.expand();
    }
  }

  private transition(next: IslandMode): void {
    if (this.current === next) return;
    const prev = this.current;
    this.current = next;
    this.onChange?.(next, prev);
  }
}
