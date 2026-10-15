import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("CSS: wavy seekbar has seamless offset and translates -24px", () => {
  const styleCss = fs.readFileSync(path.resolve("src/style.css"), "utf-8");
  const settingsCss = fs.readFileSync(path.resolve("src/settings.css"), "utf-8");

  // Check style.css
  assert.match(styleCss, /\.wavy-flow-inner\s*\{[^}]*right:\s*-48px/s, "wavy-flow-inner in style.css must extend right: -48px");
  assert.match(styleCss, /transform:\s*translate3d\(-24px,\s*0,\s*0\)/s, "wavy keyframe in style.css must translate by exactly -24px");

  // Check settings.css
  assert.match(settingsCss, /\.preview-wavy-flow-inner\s*\{[^}]*right:\s*-48px/s, "preview-wavy-flow-inner in settings.css must extend right: -48px");
  assert.match(settingsCss, /transform:\s*translate3d\(-24px,\s*0,\s*0\)/s, "wavy keyframe in settings.css must translate by exactly -24px");
});

test("CSS: responsive select dropdown is hidden by default with !important on fullscreen", () => {
  const settingsCss = fs.readFileSync(path.resolve("src/settings.css"), "utf-8");
  assert.match(settingsCss, /\.m3-responsive-select\s*\{[^}]*display:\s*none\s*!important/s, ".m3-responsive-select must be hidden by default with !important");
  assert.ok(settingsCss.includes("@media (max-width: 740px)"), "must include 740px breakpoint");
  assert.ok(settingsCss.includes(".m3-responsive-select {\n    display: inline-flex !important;"), "responsive select must only show under 740px breakpoint");
});

test("CSS: dropdown select is styled as a pill", () => {
  const settingsCss = fs.readFileSync(path.resolve("src/settings.css"), "utf-8");
  assert.match(settingsCss, /\.m3-select\s*\{[^}]*border-radius:\s*17px/s, "m3-select must have 17px rounded pill radius");
  assert.match(settingsCss, /\.m3-select-arrow/s, "m3-select-arrow must be present for dropdown arrow");
});

test("CSS: album cover has balanced 14px left and 14px bottom padding in island panel", () => {
  const styleCss = fs.readFileSync(path.resolve("src/style.css"), "utf-8");
  assert.match(styleCss, /\.island\.state-panel,\s*\.island\.state-panel-search\s*\{[^}]*padding:\s*10px\s+14px\s+14px\s+14px/s, "island panel must have 14px left and 14px bottom padding");
});

test("CSS: album cover image inherits container radius without zooming scale or stretching", () => {
  const styleCss = fs.readFileSync(path.resolve("src/style.css"), "utf-8");
  assert.match(styleCss, /\.album-art-wrap img\s*\{[^}]*border-radius:\s*inherit/s, "album art image must inherit border-radius");
  assert.match(styleCss, /\.album-art-wrap img\s*\{[^}]*transform:\s*none/s, "album art image must not have scale(1.02) zoom crop");
  assert.match(styleCss, /#art-placeholder\s*\{[^}]*border-radius:\s*inherit/s, "placeholder must inherit border-radius");
});

test("CSS: seekbar row has 14px gap ensuring thumb never overlaps 0:00 timestamp", () => {
  const styleCss = fs.readFileSync(path.resolve("src/style.css"), "utf-8");
  const settingsCss = fs.readFileSync(path.resolve("src/settings.css"), "utf-8");
  assert.match(styleCss, /\.seekbar-row\s*\{[^}]*gap:\s*14px/s, "seekbar-row in style.css must have gap: 14px");
  assert.match(settingsCss, /\.preview-seekbar-row\s*\{[^}]*gap:\s*14px/s, "preview-seekbar-row in settings.css must have gap: 14px");
});

test("CSS: mini island pill-thumb logo has transparent background and no border", () => {
  const styleCss = fs.readFileSync(path.resolve("src/style.css"), "utf-8");
  assert.match(styleCss, /\.pill-thumb\.is-logo,\s*\.pill-thumb\[style\*="logo\.png"\]\s*\{[^}]*background-color:\s*transparent\s*!important/s, "pill-thumb logo must have transparent background");
  assert.match(styleCss, /\.pill-thumb\.is-logo,\s*\.pill-thumb\[style\*="logo\.png"\]\s*\{[^}]*border:\s*none\s*!important/s, "pill-thumb logo must have no border");
});

test("CSS: mini island (state-pill) and smallest island (state-hidden) obey drop shadow variables", () => {
  const styleCss = fs.readFileSync(path.resolve("src/style.css"), "utf-8");
  const configTs = fs.readFileSync(path.resolve("src/core/config.ts"), "utf-8");
  assert.match(styleCss, /\.island\.state-pill\s*\{[^}]*box-shadow:\s*var\(\s*--kk-island-drop-shadow-pill/s, "state-pill must use --kk-island-drop-shadow-pill");
  assert.match(styleCss, /\.island\.state-hidden\s*\{[^}]*box-shadow:\s*var\(\s*--kk-island-drop-shadow-hidden/s, "state-hidden must use --kk-island-drop-shadow-hidden");
  assert.match(configTs, /--kk-island-drop-shadow-pill/s, "config.ts must set --kk-island-drop-shadow-pill");
  assert.match(configTs, /--kk-island-drop-shadow-hidden/s, "config.ts must set --kk-island-drop-shadow-hidden");
});

test("Settings: Album cover blur toggle is on top of all 3 blur sliders and sliders are disabled when blur is off", () => {
  const settingsTs = fs.readFileSync(path.resolve("src/settings.ts"), "utf-8");
  const settingsCss = fs.readFileSync(path.resolve("src/settings.css"), "utf-8");
  const configTs = fs.readFileSync(path.resolve("src/core/config.ts"), "utf-8");
  const styleCss = fs.readFileSync(path.resolve("src/style.css"), "utf-8");

  // 1. Position: switch-album-cover-blur must come BEFORE slider-bg-blur, slider-bg-blur-opacity, and slider-bg-blur-saturation
  const switchIdx = settingsTs.indexOf('id="switch-album-cover-blur"');
  const radiusIdx = settingsTs.indexOf('id="slider-bg-blur"');
  const opacityIdx = settingsTs.indexOf('id="slider-bg-blur-opacity"');
  const satIdx = settingsTs.indexOf('id="slider-bg-blur-saturation"');
  const shadowIdx = settingsTs.indexOf('id="slider-drop-shadow"');

  assert.ok(switchIdx > -1, "switch-album-cover-blur must exist");
  assert.ok(radiusIdx > -1, "slider-bg-blur must exist");
  assert.ok(opacityIdx > -1, "slider-bg-blur-opacity must exist");
  assert.ok(satIdx > -1, "slider-bg-blur-saturation must exist");
  assert.ok(shadowIdx > -1, "slider-drop-shadow must exist");

  assert.ok(switchIdx < radiusIdx, "switch-album-cover-blur must be positioned before slider-bg-blur");
  assert.ok(switchIdx < opacityIdx, "switch-album-cover-blur must be positioned before slider-bg-blur-opacity");
  assert.ok(switchIdx < satIdx, "switch-album-cover-blur must be positioned before slider-bg-blur-saturation");
  assert.ok(satIdx < shadowIdx, "slider-bg-blur-saturation must be positioned before slider-drop-shadow");

  // 2. Disabled state on 3 sliders
  assert.match(settingsTs, /setting-row \$\{cfg\.island\.albumCoverBgBlur === false \? "disabled" : ""\}" id="row-bg-blur-radius"/, "radius row must be disabled when blur is off");
  assert.match(settingsTs, /setting-row \$\{cfg\.island\.albumCoverBgBlur === false \? "disabled" : ""\}" id="row-bg-blur-opacity"/, "opacity row must be disabled when blur is off");
  assert.match(settingsTs, /setting-row \$\{cfg\.island\.albumCoverBgBlur === false \? "disabled" : ""\}" id="row-bg-blur-saturation"/, "saturation row must be disabled when blur is off");

  assert.match(settingsTs, /id="slider-bg-blur"[^>]*\$\{cfg\.island\.albumCoverBgBlur === false \? "disabled" : ""\}/, "radius slider input must have disabled attribute when blur is off");
  assert.match(settingsTs, /id="slider-bg-blur-opacity"[^>]*\$\{cfg\.island\.albumCoverBgBlur === false \? "disabled" : ""\}/, "opacity slider input must have disabled attribute when blur is off");
  assert.match(settingsTs, /id="slider-bg-blur-saturation"[^>]*\$\{cfg\.island\.albumCoverBgBlur === false \? "disabled" : ""\}/, "saturation slider input must have disabled attribute when blur is off");

  // 3. CSS styles
  assert.match(settingsCss, /\.setting-row\.disabled\s*\{[^}]*pointer-events:\s*none/s, ".setting-row.disabled must disable pointer-events");
  assert.match(settingsCss, /\.m3-slider:disabled\s*\{[^}]*cursor:\s*not-allowed/s, ".m3-slider:disabled must show not-allowed cursor");

  // 4. Saturation CSS variable in config.ts and style.css
  assert.match(configTs, /--kk-bg-blur-saturation/s, "config.ts must set --kk-bg-blur-saturation");
  assert.match(styleCss, /saturate\(var\(--kk-bg-blur-saturation,\s*200%\)\)/s, "style.css must use var(--kk-bg-blur-saturation, 200%)");
});





