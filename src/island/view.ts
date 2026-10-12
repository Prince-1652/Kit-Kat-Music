import { Spring } from "../core/anim";
import { invoke } from "@tauri-apps/api/core";
import type { IslandMode } from "./fsm";

interface IslandConfig {
  w: number;
  h: number;
  r: number;
}

const CONFIGS: Record<IslandMode, IslandConfig> = {
  hidden: { w: 240, h: 6, r: 6 },
  pill: { w: 280, h: 36, r: 16 },
  panel: { w: 620, h: 160, r: 20 },
  "panel-search": { w: 620, h: 310, r: 20 },
};

export class IslandView {
  private readonly el: HTMLElement;
  private readonly springW = new Spring(240, 0.45, 0.75);
  private readonly springH = new Spring(6, 0.45, 0.75);
  private readonly springR = new Spring(6, 0.45, 0.75);
  private isAnimating = false;

  constructor(el: HTMLElement) {
    this.el = el;
  }

  setMode(mode: IslandMode): void {
    const target = CONFIGS[mode];
    this.springW.set(target.w);
    this.springH.set(target.h);
    this.springR.set(target.r);

    this.el.className = `island state-${mode}`;
    if (!this.isAnimating) {
      this.isAnimating = true;
      requestAnimationFrame(this.tick);
    }
  }

  private tick = (): void => {
    const settledW = this.springW.step();
    const settledH = this.springH.step();
    const settledR = this.springR.step();

    const w = this.springW.value;
    const h = this.springH.value;
    const r = this.springR.value;

    this.el.style.width = `${w}px`;
    this.el.style.height = `${h}px`;
    this.el.style.borderTopLeftRadius = "0px";
    this.el.style.borderTopRightRadius = "0px";
    this.el.style.borderBottomLeftRadius = `${r}px`;
    this.el.style.borderBottomRightRadius = `${r}px`;

    // Report bounds to Tauri backend for click-through hit-testing
    const rect = this.el.getBoundingClientRect();
    invoke("update_island_shape", {
      x: rect.left,
      y: rect.top,
      w: rect.width,
      h: rect.height,
      collapsed: h < 40,
    }).catch(() => {});

    if (!settledW || !settledH || !settledR) {
      requestAnimationFrame(this.tick);
    } else {
      this.isAnimating = false;
    }
  };
}
