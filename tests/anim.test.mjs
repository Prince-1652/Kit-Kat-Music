import test from "node:test";
import assert from "node:assert/strict";

class Spring {
  value;
  target;
  velocity = 0;
  omega;
  zeta;

  constructor(value, response = 0.5, damping = 0.72) {
    this.value = value;
    this.target = value;
    this.omega = (2 * Math.PI) / response;
    this.zeta = damping;
  }

  set(target) {
    this.target = target;
  }

  get settled() {
    return Math.abs(this.target - this.value) < 0.01 && Math.abs(this.velocity) < 0.05;
  }

  step(dt = 0.016) {
    const safeDt = Math.max(0.001, Math.min(dt, 0.064));
    const steps = Math.max(1, Math.ceil(safeDt / (1 / 240)));
    const h = safeDt / steps;
    for (let i = 0; i < steps; i++) {
      const acc =
        this.omega * this.omega * (this.target - this.value) -
        2 * this.zeta * this.omega * this.velocity;
      this.velocity += acc * h;
      this.value += this.velocity * h;
    }
    if (this.settled) {
      this.value = this.target;
      this.velocity = 0;
      return true;
    }
    return false;
  }
}

test("Coucou Spring reaches target smoothly without NaN", () => {
  const spring = new Spring(0, 0.5, 0.72);
  spring.set(100);

  let settled = false;
  for (let i = 0; i < 200; i++) {
    settled = spring.step(0.016);
    assert.ok(!Number.isNaN(spring.value), "Spring value must not be NaN");
    if (settled) break;
  }

  assert.ok(settled, "Coucou Spring should settle within reasonable frames");
  assert.equal(spring.value, 100, "Spring should settle at exact target");
});

test("Coucou Spring handles large frame lag spikes safely", () => {
  const spring = new Spring(0, 0.5, 0.72);
  spring.set(50);
  // Simulate 1.5 second lag spike
  spring.step(1.5);
  assert.ok(!Number.isNaN(spring.value), "Spring value must not be NaN after lag spike");
  assert.ok(Number.isFinite(spring.value), "Spring value must be finite");
});
