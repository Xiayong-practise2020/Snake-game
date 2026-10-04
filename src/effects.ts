import type { Point } from './game/types';
import { CELL_SIZE } from './game/config';

export const BURST_LIFETIME = 650;
export const PARTICLE_COLORS = ['#ffd166', '#ff4d4d'] as const;
export type Particle = { x: number; y: number; radius: number; alpha: number; color: string };
export function foodVisual(time: number) {
  return {
    radius: 9 * (1 + .14 * Math.sin(time / 1000 * Math.PI * 2)),
    particles: Array.from({ length: 10 }, (_, i): Particle => {
      const angle = time / 800 + i * Math.PI * 2 / 10;
      const distance = 16 + 2 * Math.sin(time / 500 + i);
      return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance, radius: i % 3 === 0 ? 2 : 1.4, alpha: .8, color: PARTICLE_COLORS[i % 2] };
    }),
  };
}
export class FoodEffects {
  time = 0;
  private bursts: { point: Point; born: number }[] = [];
  get active() { return this.bursts.length > 0; }
  reset() { this.time = 0; this.bursts = []; }
  burst(point: Point) { this.bursts.push({ point: { ...point }, born: this.time }); }
  advance(milliseconds: number) {
    this.time += Math.max(0, milliseconds);
    this.bursts = this.bursts.filter(burst => this.time - burst.born < BURST_LIFETIME);
  }
  particles(cell = CELL_SIZE): Particle[] {
    return this.bursts.flatMap(burst => {
      const age = (this.time - burst.born) / 1000;
      const alpha = Math.pow(1 - (this.time - burst.born) / BURST_LIFETIME, 2);
      return Array.from({ length: 24 }, (_, i) => {
        const angle = i * Math.PI * 2 / 24;
        const distance = 5 + (70 + i % 5 * 12) * age;
        return { x: (burst.point.x + .5) * cell + Math.cos(angle) * distance,
          y: (burst.point.y + .5) * cell + Math.sin(angle) * distance + 16 * age * age,
          radius: 2.4 * (.5 + .5 * alpha), alpha, color: PARTICLE_COLORS[i % 2] };
      });
    });
  }
}
