export const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export class Spring {
  value: number;
  target: number;
  velocity = 0;
  private readonly omega: number;
  private readonly zeta: number;

  constructor(initial: number, response = 0.45, damping = 0.75) {
    this.value = initial;
    this.target = initial;
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

  step(dt = 0.016): boolean {
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
