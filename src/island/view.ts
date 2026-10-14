import { Spring } from "../core/anim";
import { invoke } from "@tauri-apps/api/core";
import type { IslandMode } from "./fsm";
import type { PanelWidthPreset } from "../core/config";

interface IslandConfig {
  w: number;
  h: number;
  r: number;
}

export class IslandView {
  private readonly el: HTMLElement;
  private readonly springW = new Spring(240, 0.5, 0.72);
  private readonly springH = new Spring(6, 0.5, 0.72);
  private readonly springR = new Spring(6, 0.5, 0.72);
  private isAnimating = false;
  private lastIpcTime = 0;
  private notchOffset = 0;
  private currentMode: IslandMode = "hidden";
  private panelWidthPx = 580;

  constructor(el: HTMLElement) {
    this.el = el;
  }

  updatePhysics(speed: "snappy" | "balanced" | "gentle"): void {
    let response = 0.5;
    let damping = 0.72;
    if (speed === "snappy") {
      response = 0.35;
      damping = 0.70;
    } else if (speed === "gentle") {
      response = 0.70;
      damping = 0.80;
    }
    this.springW.configure(response, damping);
    this.springH.configure(response, damping);
    this.springR.configure(response, damping);
  }

  setNotchOffset(offsetPx: number): void {
    this.notchOffset = offsetPx;
    this.el.style.top = `${offsetPx}px`;
    this.syncBounds(this.springW.value, this.springH.value);
  }

  setPanelWidth(preset: PanelWidthPreset): void {
    if (preset === "compact") {
      this.panelWidthPx = 520;
    } else if (preset === "expanded") {
      this.panelWidthPx = 640;
    } else {
      this.panelWidthPx = 580;
    }

    if (this.currentMode === "panel" || this.currentMode === "panel-search") {
      this.springW.set(this.panelWidthPx);
      this.syncBounds(this.panelWidthPx, this.springH.value);
      if (!this.isAnimating) {
        this.isAnimating = true;
        requestAnimationFrame(this.tick);
      }
    }
  }

  setCornerRadius(_preset: "pill" | "curved" | "compact"): void {
    // Notch design uses locked radii (17px pill / 28px panel)
  }

  private getConfigForMode(mode: IslandMode): IslandConfig {
    if (mode === "hidden") {
      return { w: 240, h: 6, r: 6 };
    }
    if (mode === "pill") {
      return { w: 280, h: 34, r: 17 };
    }
    if (mode === "panel") {
      return { w: this.panelWidthPx, h: 136, r: 28 };
    }
    // panel-search
    return { w: this.panelWidthPx, h: 287, r: 28 };
  }

  setMode(mode: IslandMode): void {
    this.currentMode = mode;
    const target = this.getConfigForMode(mode);
    this.springW.set(target.w);
    this.springH.set(target.h);
    this.springR.set(target.r);

    this.el.className = `island state-${mode}`;

    // Only send immediate update to backend on expanding so hit-test is ready instantly;
    // on collapse, let tick step down smoothly so cursor bounds don't snap prematurely
    if (target.w > this.springW.value || target.h > this.springH.value) {
      this.syncBounds(target.w, target.h);
    }

    if (!this.isAnimating) {
      this.isAnimating = true;
      requestAnimationFrame(this.tick);
    }
  }

  private syncBounds(w: number, h: number): void {
    const winW = window.innerWidth || 640;
    const x = Math.max(0, (winW - w) / 2);
    invoke("update_island_shape", {
      x,
      y: this.notchOffset,
      w,
      h,
      collapsed: h < 40,
    }).catch(() => {});
  }

  private tick = (time: number): void => {
    const settledW = this.springW.step();
    const settledH = this.springH.step();
    const settledR = this.springR.step();

    const w = this.springW.value;
    const h = this.springH.value;
    const r = this.springR.value;

    this.el.style.width = `${w}px`;
    this.el.style.height = `${h}px`;
    this.el.style.borderRadius = `0 0 ${r}px ${r}px`;

    const allSettled = settledW && settledH && settledR;

    // Throttle IPC to max once per 50ms, or when fully settled
    if (allSettled || time - this.lastIpcTime >= 50) {
      this.lastIpcTime = time;
      this.syncBounds(w, h);
    }

    if (!allSettled) {
      requestAnimationFrame(this.tick);
    } else {
      this.isAnimating = false;
    }
  };
}
