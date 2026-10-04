import { expect, it } from 'vitest';
import { FoodEffects, foodVisual, BURST_LIFETIME, PARTICLE_COLORS } from '../../src/effects';

it('食物脉冲周期缩放，金红环绕粒子随时间转动', () => {
  const first = foodVisual(0), later = foodVisual(250);
  expect(later.radius).toBeGreaterThan(first.radius);
  expect(foodVisual(750).radius).toBeLessThan(first.radius);
  expect(foodVisual(1000).radius).toBeCloseTo(first.radius);
  expect(new Set(first.particles.map(p => p.color))).toEqual(new Set(PARTICLE_COLORS));
  expect(later.particles[0].x).not.toBe(first.particles[0].x);
  expect(first.particles.every(p => Math.hypot(p.x, p.y) >= 14 && Math.hypot(p.x, p.y) <= 18.01)).toBe(true);
});
it('爆散粒子从吃到食物的位置向外移动、淡出并回收，重开清空效果', () => {
  const effects = new FoodEffects(); effects.burst({ x: 3, y: 4 });
  const first = effects.particles(); expect(first).toHaveLength(24);
  expect(new Set(first.map(p => p.color))).toEqual(new Set(PARTICLE_COLORS));
  effects.advance(200); const later = effects.particles();
  expect(later[0].x).toBeGreaterThan(first[0].x); expect(later[0].alpha).toBeLessThan(first[0].alpha);
  effects.advance(BURST_LIFETIME); expect(effects.active).toBe(false); expect(effects.particles()).toEqual([]);
  effects.burst({ x: 1, y: 1 }); effects.reset(); expect(effects.time).toBe(0); expect(effects.active).toBe(false);
});
it('多个连续食物爆散分别回收，负时间不导致动画倒退', () => {
  const effects = new FoodEffects(); effects.burst({ x: 1, y: 1 }); effects.advance(300); effects.burst({ x: 2, y: 2 });
  expect(effects.particles()).toHaveLength(48); effects.advance(-100); expect(effects.time).toBe(300);
  effects.advance(350); expect(effects.particles()).toHaveLength(24); effects.advance(300); expect(effects.active).toBe(false);
});
it('爆散中心和绘制共用28像素网格，调整尺寸不会偏移食物位置', () => {
  const effects = new FoodEffects(); effects.burst({ x: 3, y: 4 });
  const particles = effects.particles();
  expect(particles.reduce((sum, p) => sum + p.x, 0) / particles.length).toBeCloseTo(3.5 * 28);
  expect(particles.reduce((sum, p) => sum + p.y, 0) / particles.length).toBeCloseTo(4.5 * 28);
});
