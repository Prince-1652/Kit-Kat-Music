export type IslandMode = "hidden" | "pill" | "panel" | "panel-search";

export class IslandFSM {
  private current: IslandMode = "hidden";
  private isMusicPlaying = false;
  onChange?: (mode: IslandMode, prev: IslandMode) => void;

  get mode(): IslandMode {
    return this.current;
  }

  get isPlaying(): boolean {
    return this.isMusicPlaying;
  }

  setPlaying(playing: boolean): void {
    this.isMusicPlaying = playing;
    if (this.current !== "panel" && this.current !== "panel-search") {
      this.transition(playing ? "pill" : "hidden");
    }
  }

  expand(): void {
    this.transition("panel");
  }

  expandSearch(): void {
    this.transition("panel-search");
  }

  collapseSearch(): void {
    if (this.current === "panel-search") {
      this.transition("panel");
    }
  }

  collapse(): void {
    // When collapsed, return to pill first (Coucou behavior)
    this.transition("pill");
  }

  hide(): void {
    this.transition("hidden");
  }

  toggle(): void {
    if (this.current === "panel" || this.current === "panel-search") {
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
