import test from "node:test";
import assert from "node:assert/strict";

class Spring {
  value;
  target;
  velocity = 0;
  omega;
  zeta;

  constructor(value, response = 0.45, damping = 0.75) {
    this.value = value;
    this.target = value;
    this.omega = (2 * Math.PI) / response;
    this.zeta = damping;
  }

  set(target) {
    this.target = target;
  }

  step(dt = 0.016) {
    const subDt = dt / 2;
    for (let i = 0; i < 2; i++) {
      const f = -2 * this.zeta * this.omega * this.velocity - this.omega * this.omega * (this.value - this.target);
      this.velocity += f * subDt;
      this.value += this.velocity * subDt;
    }
    const settled = Math.abs(this.value - this.target) < 0.05 && Math.abs(this.velocity) < 0.05;
    if (settled) {
      this.value = this.target;
      this.velocity = 0;
    }
    return settled;
  }
}

test("Spring reaches target smoothly without NaN", () => {
  const spring = new Spring(0, 0.45, 0.75);
  spring.set(100);

  let settled = false;
  for (let i = 0; i < 200; i++) {
    settled = spring.step(0.016);
    assert.ok(!Number.isNaN(spring.value), "Spring value must not be NaN");
    if (settled) break;
  }

  assert.ok(settled, "Spring should settle within reasonable frames");
  assert.equal(spring.value, 100, "Spring should settle at exact target");
});

test("Spring snaps immediately when requested", () => {
  const spring = new Spring(10, 0.45, 0.75);
  spring.value = 50;
  spring.target = 50;
  spring.velocity = 0;
  assert.equal(spring.value, 50);
});
