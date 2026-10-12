# KitKat Desktop — DESIGN.md

Single source of truth for KitKat Desktop UI/UX.  
All styling, layouts, components, icons, and transitions MUST adhere strictly to this specification.

---

## 1. Core Principles

1. **Material 3 Dark Only**: Deep black-green canvas, container layering instead of shadows, zero glossy gradients.
2. **Strict Palette (60-30-10)**:
   * **60% Background**: `#0C130F`
   * **30% Container / Surface**: `#1B2E23`
   * **10% Highlight / Accent**: `#57D18B`
3. **No Emojis**: Strictly Lucide rounded SVG icons (`stroke-width="2"`). Use icons instead of text where appropriate.
4. **8dp Grid**: All margins, paddings, and gap sizes are multiples of 8dp (or 4dp for compact elements). Side margins: 16dp.
5. **Coucou-Style Physics**: Spring animations for state morphing (`response: 0.45`, `damping: 0.75`). No abrupt linear jumps.
6. **Zero Clutter**: If an element has no direct function, remove it.

---

## 2. Color System & Design Tokens

| Token | Hex | Role | Usage |
|---|---|---|---|
| `--kk-bg` | `#0C130F` | 60% Background | App canvas, transparent island base, menu base |
| `--kk-surface` | `#1B2E23` | 30% Container | Search bar background, result cards, inactive slider tracks, chip fill |
| `--kk-surface-hover` | `#243D2F` | Hover fill | Hover state on list cards and clickable surfaces |
| `--kk-primary` | `#57D18B` | 10% Highlight | Play FAB, active slider progress, live EQ bars, focus rings |
| `--kk-on-primary` | `#0C130F` | Text on Primary | Icon inside Play FAB |
| `--kk-text` | `#E4F0E8` | High Emphasis | Track titles, search text, active values |
| `--kk-text-dim` | `#9FB8A9` | Medium Emphasis | Artist names, time elapsed/total, placeholder text |
| `--kk-error` | `#E57373` | Error State | Network offline notice, invalid video alert |
| `--kk-border` | `rgba(87, 209, 139, 0.12)` | Subtle Outline | Island outer border stroke |

---

## 3. Typography

Font family: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`.

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
* **Expanded Panel**: `border-radius: 0 0 20px 20px` (Material 3 XL shape with reduced bottom roundness).
* **Cards / Search Field**: `border-radius: 10px`.
* **Album Art (Hero)**: `border-radius: 12px` (74x74px square).
* **Play FAB**: `border-radius: 50%` (Circle 36x36px).
* **Seekbar Track**: `border-radius: 3.5px` (Thick 7px Material 3 pill bar).

---

## 5. Island States & Layouts

### State 1: Hidden (Idle)
* **Dimensions**: Width: `240px`, Height: `6px`.
* **Position**: Top-center (`x = (screen_width - 240) / 2`, `y = 0`).
* **Visual**: Near-invisible `#0C130F` strip with `opacity: 0.65`.
* **Click-through**: Enabled outside this 6px strip.

### State 2: Compact Pill (Playing)
* **Dimensions**: Width: `280px`, Height: `36px`.
* **Position**: Pinned to top notch.
* **Layout**: Horizontal flexbox (`padding: 4px 14px`, `gap: 10px`).
  * Left: `22x22px` circular album thumbnail.
  * Center: Marquee text containing `Title • Artist` (`color: #E4F0E8`).
  * Right: 4 live bouncing EQ bars (`width: 3px`, `height: 13px`, `color: #57D18B`).
* **Hover / Leave**: Cancels/resets 10-second auto-disappear timer.
* **Click**: Morphs to State 3.
* **Inactivity**: Disappears to State 1 after 10 seconds of no interaction.

### State 3: Expanded Panel (Coucou Height: 160px)
* **Dimensions**: Width: `620px`, Height: `160px` (Expands to `310px` during search).
* **Padding**: `12px 18px 14px 18px`.
* **Sections**:
  1. **Header (34px)**:
     * Full-width search bar (`#1B2E23`, `height: 34px`, `padding: 0 12px`, `border-radius: 10px`).
     * Left: `Search` icon (`16px`, `#9FB8A9`).
     * Input: Transparent text input (`13px`, `#E4F0E8`).
     * Right: `X` icon (clear, shown only when text entered).
     * No closing arrow: clicking outside collapses island.
  2. **Search Mode (Dynamic Expansion to 310px)**:
     * When search bar is focused or query typed, height springs smoothly to `310px`.
     * Shows scrollable search results list (up to 4 results, `40px` each).
     * Selecting a song plays it and collapses height back to `160px`.
  3. **Horizontal Media Player (88px)**:
     * Left: Album art (`74x74px` with subtle glowing border).
     * Right:
       * Row 1: Title (`14px` bold) + Artist (`11px` dim), right-aligned Volume icon + slider.
       * Row 2: Thick seekbar (`7px` pill bar with gradient progress fill), elapsed & total time.
       * Row 3: Centered Skip Backward (`18px`), Play/Pause FAB (`36x36px` `#57D18B`), Skip Forward (`18px`).

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
* `ChevronUp`: `<path d="m18 15-6-6-6 6"/>`
* `X`: `<path d="M18 6 6 18"/><path d="m6 6 12 12"/>`
* `Loader2`: `<path d="M21 12a9 9 0 1 1-6.219-8.56"/>`
* `WifiOff`: `<line x1="2" y1="2" x2="22" y2="22"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><path d="M2 8.82a15 15 0 0 1 4.17-2.65"/><path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76"/><path d="M16.85 11.25a10 10 0 0 1 2.22 1.68"/><path d="M5 13a10 10 0 0 1 5.24-2.78"/><line x1="12" y1="20" x2="12.01" y2="20"/>`

---

## 7. Motion & Physics Tokens

* **Spring Response**: `0.45s`
* **Damping Fraction**: `0.75` (zero oscillation overshoot, snap-settle)
* **Fade Curve**: `cubic-bezier(0.4, 0, 0.2, 1)` (Material 3 standard easing)
* **Hover Scale**: `transform: scale(1.04)` on buttons; `transform: scale(0.96)` on press.
