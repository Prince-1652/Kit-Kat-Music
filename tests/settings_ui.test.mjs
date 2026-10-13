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

test("CSS: dropdown select is styled as a Material 3 Expressive pill", () => {
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

