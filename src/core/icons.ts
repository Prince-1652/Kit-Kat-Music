export type IconName =
  | "search"
  | "play"
  | "pause"
  | "skipForward"
  | "skipBack"
  | "volume2"
  | "volumeX"
  | "x"
  | "music"
  | "settings"
  | "check"
  | "wifiOff"
  | "chevronDown"
  | "download"
  | "refreshCw";

const ICONS: Record<IconName, string> = {
  download: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path vector-effect="non-scaling-stroke" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  refreshCw: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path vector-effect="non-scaling-stroke" d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path vector-effect="non-scaling-stroke" d="M21 3v5h-5"/><path vector-effect="non-scaling-stroke" d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path vector-effect="non-scaling-stroke" d="M8 16H3v5"/></svg>`,
  chevronDown: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path vector-effect="non-scaling-stroke" d="m6 9 6 6 6-6"/></svg>`,
  settings: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path vector-effect="non-scaling-stroke" d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle vector-effect="non-scaling-stroke" cx="12" cy="12" r="3"/></svg>`,
  check: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 12 9 17 20 6"/></svg>`,
  music: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path vector-effect="non-scaling-stroke" d="M9 18V5l12-2v13"/><circle vector-effect="non-scaling-stroke" cx="6" cy="18" r="3"/><circle vector-effect="non-scaling-stroke" cx="18" cy="16" r="3"/></svg>`,
  play: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path vector-effect="non-scaling-stroke" d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"/></svg>`,
  pause: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect vector-effect="non-scaling-stroke" x="14" y="3" width="5" height="18" rx="1"/><rect vector-effect="non-scaling-stroke" x="5" y="3" width="5" height="18" rx="1"/></svg>`,
  skipBack: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path vector-effect="non-scaling-stroke" d="M17.971 4.285A2 2 0 0 1 21 6v12a2 2 0 0 1-3.029 1.715l-9.997-5.998a2 2 0 0 1-.003-3.432z"/><path vector-effect="non-scaling-stroke" d="M3 20V4"/></svg>`,
  skipForward: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path vector-effect="non-scaling-stroke" d="M21 4v16"/><path vector-effect="non-scaling-stroke" d="M6.029 4.285A2 2 0 0 0 3 6v12a2 2 0 0 0 3.029 1.715l9.997-5.998a2 2 0 0 0 .003-3.432z"/></svg>`,
  volume2: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path vector-effect="non-scaling-stroke" d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/><path vector-effect="non-scaling-stroke" d="M16 9a5 5 0 0 1 0 6"/><path vector-effect="non-scaling-stroke" d="M19.364 18.364a9 9 0 0 0 0-12.728"/></svg>`,
  volumeX: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path vector-effect="non-scaling-stroke" d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/><path vector-effect="non-scaling-stroke" d="m16.5 14.5 5-5"/><path vector-effect="non-scaling-stroke" d="m16.5 9.5 5 5"/></svg>`,
  search: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path vector-effect="non-scaling-stroke" d="m21 21-4.34-4.34"/><circle vector-effect="non-scaling-stroke" cx="11" cy="11" r="8"/></svg>`,
  x: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path vector-effect="non-scaling-stroke" d="M18 6 6 18"/><path vector-effect="non-scaling-stroke" d="m6 6 12 12"/></svg>`,
  wifiOff: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path vector-effect="non-scaling-stroke" d="M12 20h.01"/><path vector-effect="non-scaling-stroke" d="M8.5 16.429a5 5 0 0 1 7 0"/><path vector-effect="non-scaling-stroke" d="M5 12.859a10 10 0 0 1 5.17-2.69"/><path vector-effect="non-scaling-stroke" d="M19 12.859a10 10 0 0 0-2.007-1.523"/><path vector-effect="non-scaling-stroke" d="M2 8.82a15 15 0 0 1 4.177-2.643"/><path vector-effect="non-scaling-stroke" d="M22 8.82a15 15 0 0 0-11.288-3.764"/><path vector-effect="non-scaling-stroke" d="m2 2 20 20"/></svg>`,
};

export function renderIcon(name: IconName, className = "icon"): string {
  const svg = ICONS[name] || "";
  return svg.replace("<svg ", `<svg class="${className}" `);
}

export function renderM3Loader(label = "Searching..."): string {
  return `
    <div class="m3-loader-wrap">
      <div class="m3-shape-morph"></div>
      ${label ? `<span class="m3-loader-label">${label}</span>` : ""}
    </div>
  `;
}
