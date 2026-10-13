# KitKat Desktop — DESIGN.md

Single source of truth for KitKat Desktop UI/UX.  
All styling, layouts, components, icons, and transitions MUST adhere strictly to this specification.

---

## 1. Core Principles

1. **Material 3 Dark Only**: Sleek dark/OLED canvas, container layering instead of shadows, zero shadows on island.
2. **Strict Palette (60-30-10)**:
   * **60% Background**: `#0A0A0B` (Clean deep dark, zero green cast)
   * **30% Container / Surface**: `#161618`
   * **10% Highlight / Accent**: `#4ADE80` (Refined Material green accent)
3. **No Emojis**: Strictly Lucide rounded SVG icons (`stroke-width="2"`). Use icons instead of text where appropriate.
4. **8dp Grid**: All margins, paddings, and gap sizes are multiples of 8dp (or 4dp for compact elements). Zero dead space.
5. **Coucou-Style Physics**: Exact Coucou spring physics (`response: 0.5`, `dampingFraction: 0.72`). No abrupt linear jumps.
6. **Zero Clutter**: If an element has no direct function, remove it.

---

## 2. Color System & Design Tokens (60-30-10 Rule)

| Token | Value | Role | Usage |
|---|---|---|---|
| `--kk-bg` | `#0A0A0B` | 60% Canvas / Base | App canvas, island background, wake strip |
| `--kk-surface` | `#161618` | 30% Structural Surface | Search bar, result cards, secondary buttons, album art base |
| `--kk-surface-hover` | `#202023` | 30% Surface Hover | Hover states on cards, chips, buttons |
| `--kk-surface-active` | `#2A2A2E` | 30% Surface Active | Pressed states on cards, chips, buttons |
| `--kk-surface-variant` | `#1B1B1E` | 30% Surface Variant | Focused search bar container fill |
| `--kk-outline` | `rgba(255, 255, 255, 0.08)` | 30% Border Outline | Island stroke, card border, chip outline |
| `--kk-outline-variant` | `rgba(255, 255, 255, 0.14)` | 30% Hover Outline | Hovered chip/card outline, album art border |
| `--kk-text` | `#F3F3F5` | 30% High Emphasis Text | Track titles, search text, active values |
| `--kk-text-dim` | `#8F8F94` | 30% Medium Emphasis Text | Artist names, time labels, volume slider thumb |
| `--kk-primary` | `#4ADE80` | 10% Material Accent | Play FAB, seekbar progress fill, live EQ bars |
| `--kk-primary-hover` | `#5EE492` | 10% Accent Hover | Hover state on Play FAB |
| `--kk-primary-active` | `#38C46F` | 10% Accent Pressed | Pressed state on Play FAB |
| `--kk-primary-container` | `rgba(74, 222, 128, 0.12)` | 10% Accent Tint | Discovery badge icon container |
| `--kk-primary-outline` | `rgba(74, 222, 128, 0.28)` | 10% Accent Focus | Album art playing border, focus borders |
| `--kk-on-primary` | `#0A0A0B` | Contrast on Accent | Text and icon inside Play FAB |
| `--kk-error` | `#F87171` | Semantic Alert | Error badge, offline notice text |
| `--kk-error-container` | `rgba(248, 113, 113, 0.12)` | Error Container | Error icon badge background |
| `--kk-error-outline` | `rgba(248, 113, 113, 0.25)` | Error Outline | Error icon badge border |

---

## 3. Typography

Font family: `'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`.

| Style | Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| `Headline` | 18px | 600 | 24px | Player hero track title (Expanded panel) |
| `Title` | 14px | 500 | 20px | Search result title, search input text |
| `Body` | 12px | 500 | 16px | Pill scrolling title, artist name |
| `Caption` | 10px | 400 | 14px | Scrubber timestamp, badge duration |

---

## 4. Shapes & Corner Radii

* **Top Corners**: Flat (`border-top-left-radius: 0; border-top-right-radius: 0`) across all island states.
* **Pill**: `border-radius: 0 0 16px 16px`.
* **Expanded Panel**: `border-radius: 0 0 18px 18px` (Material 3 XL shape).
* **Cards / Search Field**: `border-radius: 10px`.
* **Album Art (Hero)**: `border-radius: 12px` (74x74px square, crisp border `1px solid var(--kk-outline-variant)` brightening to `1.5px solid var(--kk-primary-outline)` when song is playing, cropped with `object-fit: cover`).
* **Play Button**: Fixed-width pill button (`width: 92px`, `border-radius: 16px`, height 32px) with icon on left and text ("Play" / "Pause") centered, zero shadow/glow, identical dimensions in both states, polished tactile hover lift (`translateY(-1px)`).
* **Seekbar Track**: Thick continuous Material 3 progress bar (constant 8px height, rounded leading cap on active timing fill, zero circular thumb dot).
* **App Logo**: Fox mascot (`logo.png`), used for OS bundle icons (`.ico`), default compact pill thumbnail, and player album art placeholder when idle.

---

## 5. Island States & Layouts

### State 1: Hidden (Idle)
* **Dimensions**: Width: `240px`, Height: `6px`.
* **Position**: Top-center (`x = (screen_width - 240) / 2`, `y = 0`).
* **Visual**: Near-invisible `#0A0A0B` strip with `opacity: 0.65`.
* **Click-through**: Enabled outside this 6px strip.

### State 2: Compact Pill (Playing)
* **Dimensions**: Width: `280px`, Height: `34px`.
* **Position**: Pinned to top notch.
* **Layout**: Horizontal flexbox (`padding: 3px 12px`, `gap: 8px`).
  * Left: `22x22px` circular album thumbnail.
  * Center: Marquee text containing `Title • Artist` (`color: #F3F3F5`).
  * Right: 4 live bouncing EQ bars (`width: 2.5px`, `height: 12px`, `color: #4ADE80`).
* **Hover / Leave**: Cancels/resets 10-second auto-disappear timer.
* **Click**: Morphs to State 3.
* **Inactivity**: Disappears to State 1 after 10 seconds of no interaction.

### State 3: Expanded Panel (Snug Height: 130px)
* **Dimensions**: Width: `580px`, Height: `130px` (Expands to `281px` during search).
* **Padding**: `8px 14px 10px 14px`.
* **Sections**:
  1. **Header (32px)**:
     * Full-width search bar (`#161618`, `height: 32px`, `padding: 0 10px`, `border-radius: 10px`).
     * Left: `Search` icon (`16px`, `#8F8F94`).
     * Input: Transparent text input (`13px`, `#F3F3F5`, `autocomplete="off"`, `spellcheck="false"`, no browser tooltips).
     * Right: `X` icon (clear, shown only when text entered, zero browser hover tooltips).
     * Clicking outside collapses island.
  2. **Search Mode (Dynamic Expansion to 281px)**:
     * When search bar is focused or query typed, height springs smoothly to `281px`.
     * **Discovery / Idle State**: Minimal Material 3 search empty state with centered icon badge and subtitle prompt ("Type a track, artist, or album name"). Zero chip clutter.
     * **No Results & Error States**: Distinct circular icon badge (`search` or `wifiOff`), clear heading, and contextual guidance.
     * Material 3 Expressive Shape-Morphing progress indicator (`.m3-shape-morph` circle -> squircle -> clover -> scallop morph).
     * Shows scrollable search results list (up to 4 results, `34px` each).
     * Selecting a song plays it and collapses height back to `130px`.
  3. **Horizontal Media Player (74px)**:
     * Left: Album art (`74x74px` with subtle outline border, zero letterbox seams).
     * Right:
       * Row 1: Title (`13px` bold) + Artist (`11px` dim), right-aligned Volume icon + slider.
       * Row 2: Thick continuous Material 3 seekbar (`8px` constant height, rounded leading cap on active timing fill, zero desynced thumb dot), elapsed & total time.
       * Row 3: Centered Skip Backward (`32x32px` tonal background `#161618`), Pill-shaped Play/Pause button (`height: 32px`, `width: 92px` fixed `#4ADE80` with icon + text, zero shadow/glow, polished hover lift), Skip Forward (`32x32px` tonal background `#161618`).

---

## 6. Icons (Lucide SVGs)

All icons use `stroke="currentColor"` and `stroke-width="2"`:
* `Search`: `<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>`
* `Play`: `<polygon points="6 3 20 12 6 21 6 3"/>`
* `Pause`: `<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>`
* `SkipForward`: `<polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/>`
* `SkipBack`: `<polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/>`
* `Volume2`: `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>`
* `VolumeX`: `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/>`
* `X`: `<path d="M18 6 6 18"/><path d="m6 6 12 12"/>`
* `Music`: `<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>`
* `WifiOff`: `<line x1="2" y1="2" x2="22" y2="22"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><path d="M2 8.82a15 15 0 0 1 4.17-2.65"/><path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76"/><path d="M16.85 11.25a10 10 0 0 1 2.22 1.68"/><path d="M5 13a10 10 0 0 1 5.24-2.78"/><line x1="12" y1="20" x2="12.01" y2="20"/>`

---

## 7. Motion & Physics Tokens

* **Spring Response**: `0.45s`
* **Damping Fraction**: `0.75` (zero oscillation overshoot, snap-settle)
* **Fade Curve**: `cubic-bezier(0.4, 0, 0.2, 1)` (Material 3 standard easing)
* **Hover Scale & Lift**: `translateY(-1px)` tactile lift on pill play button; `transform: scale(1.06)` on secondary buttons; `transform: scale(0.97)` on press.
