import { emit, listen } from "@tauri-apps/api/event";

export interface AppThemeConfig {
  accentColor: string;
  darkSurface: "oled" | "deep" | "charcoal";
}

export type SeekbarStyle = "continuous" | "wavy-animated" | "wavy-still" | "with-stops";

export interface SeekbarConfig {
  heightPx: 4 | 8 | 12;
  style: SeekbarStyle;
  showThumb: boolean;
  showHoverGlow: boolean;
  showTimeLabels: boolean;
}

export type PanelWidthPreset = "compact" | "standard" | "expanded";
export type ArtworkShapePreset = "squircle" | "circle" | "sharp";
export type WaveSpeedPreset = "relaxed" | "normal" | "energetic";

export interface IslandConfigCustom {
  autoHideSeconds: number; // 0 = never, 5, 10, 15
  springSpeed: "snappy" | "balanced" | "gentle";
  notchOffsetPx: number; // 0, 4, 8
  eqStyle: "bars" | "wave" | "pulse" | "off";
  surfaceMaterial: "acrylic" | "solid" | "ambient";
  cornerRadius: "pill" | "curved" | "compact";
  panelWidth: PanelWidthPreset;
  artworkShape: ArtworkShapePreset;
  waveSpeed: WaveSpeedPreset;
  artworkGlow: boolean;
  showVolumeControl: boolean;
  skipDurationSecs: 5 | 10 | 15 | 30;
  launchAtStartup: boolean;
  autoCheckUpdates: boolean;
  bgBlurRadiusPx: number;
  bgBlurOpacity: number;
  dropShadow: number;
  albumCoverBgBlur: boolean;
}

export interface AppConfig {
  theme: AppThemeConfig;
  seekbar: SeekbarConfig;
  island: IslandConfigCustom;
}

export const THEME_PRESETS: Record<string, { label: string; primary: string; hover: string; active: string; container: string; outline: string }> = {
  "#4ADE80": {
    label: "Mint Emerald",
    primary: "#4ADE80",
    hover: "#5EE492",
    active: "#38C46F",
    container: "rgba(74, 222, 128, 0.14)",
    outline: "rgba(74, 222, 128, 0.3)",
  },
  "#38BDF8": {
    label: "Sky Cyan",
    primary: "#38BDF8",
    hover: "#60A5FA",
    active: "#0284C7",
    container: "rgba(56, 189, 248, 0.14)",
    outline: "rgba(56, 189, 248, 0.3)",
  },
  "#C084FC": {
    label: "Lavender Iris",
    primary: "#C084FC",
    hover: "#D8B4FE",
    active: "#9333EA",
    container: "rgba(192, 132, 252, 0.14)",
    outline: "rgba(192, 132, 252, 0.3)",
  },
  "#FB923C": {
    label: "Sunset Amber",
    primary: "#FB923C",
    hover: "#FDBA74",
    active: "#EA580C",
    container: "rgba(251, 146, 60, 0.14)",
    outline: "rgba(251, 146, 60, 0.3)",
  },
  "#F472B6": {
    label: "Rose Petal",
    primary: "#F472B6",
    hover: "#F9A8D4",
    active: "#DB2777",
    container: "rgba(244, 114, 182, 0.14)",
    outline: "rgba(244, 114, 182, 0.3)",
  },
  "#94A3B8": {
    label: "Titanium Slate",
    primary: "#94A3B8",
    hover: "#CBD5E1",
    active: "#64748B",
    container: "rgba(148, 163, 184, 0.14)",
    outline: "rgba(148, 163, 184, 0.3)",
  },
  "#F87171": {
    label: "Coral Flame",
    primary: "#F87171",
    hover: "#FCA5A5",
    active: "#DC2626",
    container: "rgba(248, 113, 113, 0.14)",
    outline: "rgba(248, 113, 113, 0.3)",
  },
  "#A3E635": {
    label: "Lime Electra",
    primary: "#A3E635",
    hover: "#BEF264",
    active: "#65A30D",
    container: "rgba(163, 230, 53, 0.14)",
    outline: "rgba(163, 230, 53, 0.3)",
  },
  "#818CF8": {
    label: "Indigo Neon",
    primary: "#818CF8",
    hover: "#A5B4FC",
    active: "#4F46E5",
    container: "rgba(129, 140, 248, 0.14)",
    outline: "rgba(129, 140, 248, 0.3)",
  },
  "#FBBF24": {
    label: "Amber Gold",
    primary: "#FBBF24",
    hover: "#FCD34D",
    active: "#D97706",
    container: "rgba(251, 191, 36, 0.14)",
    outline: "rgba(251, 191, 36, 0.3)",
  },
};

export const SURFACE_PRESETS: Record<string, { bg: string; surface: string; hover: string; active: string; variant: string }> = {
  oled: {
    bg: "#0A0A0B",
    surface: "#161618",
    hover: "#202023",
    active: "#2A2A2E",
    variant: "#1B1B1E",
  },
  deep: {
    bg: "#111113",
    surface: "#1B1B1E",
    hover: "#26262A",
    active: "#313136",
    variant: "#222226",
  },
  charcoal: {
    bg: "#18181B",
    surface: "#222226",
    hover: "#2C2C32",
    active: "#38383F",
    variant: "#28282E",
  },
};

export const DEFAULT_CONFIG: AppConfig = {
  theme: {
    accentColor: "#FB923C",
    darkSurface: "oled",
  },
  seekbar: {
    heightPx: 8,
    style: "continuous",
    showThumb: true,
    showHoverGlow: true,
    showTimeLabels: true,
  },
  island: {
    autoHideSeconds: 10,
    springSpeed: "balanced",
    notchOffsetPx: 0,
    eqStyle: "bars",
    surfaceMaterial: "acrylic",
    cornerRadius: "curved",
    panelWidth: "standard",
    artworkShape: "squircle",
    waveSpeed: "normal",
    artworkGlow: true,
    showVolumeControl: true,
    skipDurationSecs: 10,
    launchAtStartup: false,
    autoCheckUpdates: true,
    bgBlurRadiusPx: 36,
    bgBlurOpacity: 62,
    dropShadow: 85,
    albumCoverBgBlur: true,
  },
};

const STORAGE_KEY = "kitkat-desktop-config";

export function loadConfig(): AppConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return DEFAULT_CONFIG;
    }
    return {
      theme: { ...DEFAULT_CONFIG.theme, ...(parsed.theme && typeof parsed.theme === "object" ? parsed.theme : {}) },
      seekbar: { ...DEFAULT_CONFIG.seekbar, ...(parsed.seekbar && typeof parsed.seekbar === "object" ? parsed.seekbar : {}) },
      island: { ...DEFAULT_CONFIG.island, ...(parsed.island && typeof parsed.island === "object" ? parsed.island : {}) },
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(cfg: AppConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    // Local window event
    window.dispatchEvent(new CustomEvent("kitkat-config-changed", { detail: cfg }));
    // Cross-window Tauri IPC event
    emit("config-updated", cfg).catch(() => {});
  } catch (err) {
    console.error("Failed to save config:", err);
  }
}

function hexToRgb(hex: string): string {
  const clean = hex.replace("#", "");
  const num = parseInt(clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `${r}, ${g}, ${b}`;
}

export function applyThemeToDOM(cfg: AppConfig, root: HTMLElement = document.documentElement): void {
  const accent = (cfg?.theme?.accentColor && THEME_PRESETS[cfg.theme.accentColor]) || THEME_PRESETS[DEFAULT_CONFIG.theme.accentColor] || THEME_PRESETS["#4ADE80"];
  const surface = (cfg?.theme?.darkSurface && SURFACE_PRESETS[cfg.theme.darkSurface]) || SURFACE_PRESETS[DEFAULT_CONFIG.theme.darkSurface] || SURFACE_PRESETS.oled;

  const rgb = hexToRgb(accent.primary);
  root.style.setProperty("--kk-primary-rgb", rgb);
  root.style.setProperty("--kk-glow-core", `rgba(${rgb}, 0.54)`);
  root.style.setProperty("--kk-glow-mid", `rgba(${rgb}, 0.22)`);
  root.style.setProperty("--kk-glow-subtle", `rgba(${rgb}, 0.06)`);
  root.style.setProperty("--kk-glow-halo", `rgba(${rgb}, 0.34)`);

  root.style.setProperty("--kk-primary", accent.primary);
  root.style.setProperty("--kk-primary-hover", accent.hover);
  root.style.setProperty("--kk-primary-active", accent.active);
  root.style.setProperty("--kk-primary-container", accent.container);
  root.style.setProperty("--kk-primary-outline", accent.outline);

  root.style.setProperty("--kk-bg", surface.bg);
  root.style.setProperty("--kk-surface", surface.surface);
  root.style.setProperty("--kk-surface-hover", surface.hover);
  root.style.setProperty("--kk-surface-active", surface.active);
  root.style.setProperty("--kk-surface-variant", surface.variant);

  root.style.setProperty("--kk-seekbar-height", `${cfg.seekbar.heightPx}px`);
  root.style.setProperty("--kk-notch-offset", `${cfg.island.notchOffsetPx}px`);

  const blurPx = cfg?.island?.bgBlurRadiusPx ?? 36;
  const blurOpacityPercent = cfg?.island?.bgBlurOpacity ?? 62;
  const blurOpacity = blurOpacityPercent / 100;
  root.style.setProperty("--kk-bg-blur", `${blurPx}px`);
  root.style.setProperty("--kk-bg-blur-opacity", `${blurOpacity}`);
  root.style.setProperty("--kk-bg-blur-opacity-pill", `${Math.round(blurOpacity * 0.7 * 100) / 100}`);

  const showCoverBlur = cfg?.island?.albumCoverBgBlur !== false;
  if (!showCoverBlur) {
    root.style.setProperty("--kk-cover-glow-display", "none");
    root.classList.add("no-cover-blur");
  } else {
    root.style.setProperty("--kk-cover-glow-display", "block");
    root.classList.remove("no-cover-blur");
  }

  const shadowPercent = cfg?.island?.dropShadow ?? 85;
  const shadowAlpha = (shadowPercent / 100).toFixed(2);
  const shadowBlur = Math.round((24 * shadowPercent) / 85);
  const shadowY = Math.round((12 * shadowPercent) / 85);
  root.style.setProperty("--kk-drop-shadow-opacity", shadowAlpha);
  root.style.setProperty(
    "--kk-island-drop-shadow",
    shadowPercent === 0
      ? "none"
      : `0 ${shadowY}px ${shadowBlur}px -6px rgba(0, 0, 0, ${shadowAlpha})`
  );

  if (cfg.seekbar.showHoverGlow) {
    root.style.setProperty("--kk-seekbar-glow", `0 0 6px -1px rgba(${rgb}, 0.35)`);
  } else {
    root.style.setProperty("--kk-seekbar-glow", "none");
  }

  // Surface material effect
  if (cfg.island.surfaceMaterial === "acrylic") {
    root.style.setProperty("--kk-island-backdrop", "blur(24px) saturate(180%)");
    root.style.setProperty("--kk-island-bg", `${surface.bg}E6`);
    root.style.setProperty("--kk-island-shadow", "0 10px 30px rgba(0, 0, 0, 0.4)");
  } else if (cfg.island.surfaceMaterial === "ambient") {
    root.style.setProperty("--kk-island-backdrop", "none");
    root.style.setProperty("--kk-island-bg", surface.bg);
    root.style.setProperty("--kk-island-shadow", `0 8px 30px ${accent.container}`);
  } else {
    root.style.setProperty("--kk-island-backdrop", "none");
    root.style.setProperty("--kk-island-bg", surface.bg);
    root.style.setProperty("--kk-island-shadow", "none");
  }

  // Island corner radius style
  if (cfg.island.cornerRadius === "pill") {
    root.style.setProperty("--kk-radius-pill", "20px");
    root.style.setProperty("--kk-radius-panel", "22px");
  } else if (cfg.island.cornerRadius === "compact") {
    root.style.setProperty("--kk-radius-pill", "10px");
    root.style.setProperty("--kk-radius-panel", "12px");
  } else {
    root.style.setProperty("--kk-radius-pill", "16px");
    root.style.setProperty("--kk-radius-panel", "18px");
  }

  // Artwork geometry shape / corner radius
  if (cfg.island.artworkShape === "circle") {
    root.style.setProperty("--kk-art-radius", "20px");
  } else if (cfg.island.artworkShape === "sharp") {
    root.style.setProperty("--kk-art-radius", "4px");
  } else {
    root.style.setProperty("--kk-art-radius", "12px");
  }

  // Squiggly wave flow animation speed
  if (cfg.island.waveSpeed === "relaxed") {
    root.style.setProperty("--kk-wave-duration", "1.8s");
  } else if (cfg.island.waveSpeed === "energetic") {
    root.style.setProperty("--kk-wave-duration", "0.8s");
  } else {
    root.style.setProperty("--kk-wave-duration", "1.2s");
  }

  // Artwork glow effect
  if (cfg.island.artworkGlow) {
    root.style.setProperty("--kk-art-glow", `0 4px 18px ${accent.container}, 0 0 10px ${accent.outline}`);
  } else {
    root.style.setProperty("--kk-art-glow", "none");
  }

  // Panel width preset
  if (cfg.island.panelWidth === "compact") {
    root.style.setProperty("--kk-panel-width", "520px");
    root.style.setProperty("--kk-preview-mock-width", "440px");
  } else if (cfg.island.panelWidth === "expanded") {
    root.style.setProperty("--kk-panel-width", "640px");
    root.style.setProperty("--kk-preview-mock-width", "520px");
  } else {
    root.style.setProperty("--kk-panel-width", "580px");
    root.style.setProperty("--kk-preview-mock-width", "480px");
  }
}

export function listenForConfigUpdates(callback: (cfg: AppConfig) => void): () => void {
  // Listen locally
  const localHandler = (e: Event) => {
    const detail = (e as CustomEvent<AppConfig>).detail;
    callback(detail);
  };
  window.addEventListener("kitkat-config-changed", localHandler);

  // Listen cross-window
  let unlistenTauri: (() => void) | null = null;
  listen<AppConfig>("config-updated", (event) => {
    callback(event.payload);
  }).then((unlisten) => {
    unlistenTauri = unlisten;
  }).catch(() => {});

  return () => {
    window.removeEventListener("kitkat-config-changed", localHandler);
    unlistenTauri?.();
  };
}
