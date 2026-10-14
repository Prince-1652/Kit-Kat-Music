import test from "node:test";
import assert from "node:assert/strict";

function isNewerVersion(current, latest) {
  const clean = (v) => v.replace(/^v/, "").trim();
  const cParts = clean(current).split(".").map((n) => parseInt(n, 10) || 0);
  const lParts = clean(latest).split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const c = cParts[i] || 0;
    const l = lParts[i] || 0;
    if (l > c) return true;
    if (l < c) return false;
  }
  return false;
}

test("Version comparison: detects newer releases correctly", () => {
  assert.equal(isNewerVersion("0.1.0", "v0.1.1"), true);
  assert.equal(isNewerVersion("0.1.0", "v0.2.0"), true);
  assert.equal(isNewerVersion("0.1.0", "v1.0.0"), true);
  assert.equal(isNewerVersion("0.1.0", "0.1.0"), false);
  assert.equal(isNewerVersion("0.2.0", "v0.1.9"), false);
});
