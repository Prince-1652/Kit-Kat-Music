/**
 * Coucou exact Spring physics solver matching SwiftUI .spring(response: 0.5, dampingFraction: 0.72)
 */
export class Spring {
  value: number;
  target: number;
  velocity = 0;
  omega: number;
  zeta: number;

  constructor(value: number, response = 0.5, damping = 0.72) {
    this.value = value;
    this.target = value;
    this.omega = (2 * Math.PI) / response;
    this.zeta = damping;
  }

  configure(response: number, damping: number): void {
    this.omega = (2 * Math.PI) / response;
    this.zeta = damping;
  }

  set(target: number): void {
    this.target = target;
  }

  snap(value: number): void {
    this.value = value;
    this.target = value;
    this.velocity = 0;
  }

  get settled(): boolean {
    return Math.abs(this.target - this.value) < 0.01 && Math.abs(this.velocity) < 0.05;
  }

  step(dt = 0.016): boolean {
    // Clamp delta-time to avoid numerical instability on frame lag spikes
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
