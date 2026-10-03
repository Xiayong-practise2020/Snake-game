import { test, expect } from '@playwright/test';
import type { State } from '../../src/game/types';
declare global { interface Window { __snake: { state(): State; load(state: State): void; effects(): { time: number; particles: { x: number; y: number; alpha: number; color: string }[] } } } }
declare global { interface Window { __audio: { contexts: AudioContext[]; tones: { start: number; end: number; type: string }[]; noise: number } } }
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  // Pause before loading the game, allowing for slow browser startup on Windows.
  await page.clock.pauseAt(new Date('2026-01-02T00:00:00Z'));
  await page.goto('/');
});
test('默认音效、原生音频频率、有效转向、死亡和静音切换', async ({ page }) => {
  test.setTimeout(240_000);
  // The Windows WebKit test build has no Web Audio implementation.
  if (!await page.evaluate(() => typeof window.AudioContext === 'function')) {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await expect(page.locator('#mute')).toHaveAttribute('aria-pressed', 'false');
    await page.getByRole('button', { name: '开始游戏' }).click();
    await page.evaluate(() => window.__snake.load({ ...window.__snake.state(), food: { x: 13, y: 12 } }));
    await page.clock.runFor(250); await expect(page.locator('#score')).toHaveText('1');
    await page.locator('#mute').focus(); await page.keyboard.press('Space');
    await expect(page.locator('#mute')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#mute').click(); await expect(page.locator('#mute')).toHaveAttribute('aria-pressed', 'false');
    expect(errors).toEqual([]); return;
  }
  await page.addInitScript(() => {
    window.__audio = { contexts: [], tones: [], noise: 0 };
    const NativeContext = window.AudioContext;
    window.AudioContext = class extends NativeContext {
      constructor() { super(); window.__audio.contexts.push(this); }
      createOscillator() {
        const oscillator = super.createOscillator();
        const tone = { start: 0, end: 0, type: '' }; window.__audio.tones.push(tone);
        const set = oscillator.frequency.setValueAtTime.bind(oscillator.frequency);
        const ramp = oscillator.frequency.exponentialRampToValueAtTime.bind(oscillator.frequency);
        oscillator.frequency.setValueAtTime = (value, time) => { tone.start = value; return set(value, time); };
        oscillator.frequency.exponentialRampToValueAtTime = (value, time) => { tone.end = value; return ramp(value, time); };
        const start = oscillator.start.bind(oscillator);
        oscillator.start = (time) => { tone.type = oscillator.type; start(time); };
        return oscillator;
      }
      createBufferSource() { window.__audio.noise++; return super.createBufferSource(); }
    };
  });
  await page.reload();
  const mute = page.locator('#mute');
  await expect(mute).toHaveText('音效：开启 · 静音'); await expect(mute).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(() => window.__audio.contexts.length)).toBe(0);
  await page.getByRole('button', { name: '开始游戏' }).click();
  await expect.poll(() => page.evaluate(() => window.__audio.contexts[0]?.state), { timeout: 20_000 }).toBe('running');
  await page.evaluate(() => window.__snake.load({ ...window.__snake.state(), food: { x: 13, y: 12 } }));
  await page.clock.runFor(250);
  expect(await page.evaluate(() => window.__audio.tones)).toEqual([{ start: 400, end: 800, type: 'sine' }]);
  await page.evaluate(() => window.__snake.load({ ...window.__snake.state(), food: null }));
  await page.keyboard.press('ArrowLeft'); await page.clock.runFor(250);
  expect(await page.evaluate(() => window.__audio.tones.length)).toBe(1);
  await page.keyboard.press('w'); expect(await page.evaluate(() => window.__audio.tones.length)).toBe(1);
  await page.clock.runFor(250);
  expect(await page.evaluate(() => window.__audio.tones.at(-1)?.start)).toBe(620);
  await page.evaluate(() => window.__snake.load({ ...window.__snake.state(), snake: [{ x: 24, y: 12 }, { x: 23, y: 12 }, { x: 22, y: 12 }], direction: 'right' }));
  await page.clock.runFor(250);
  expect(await page.evaluate(() => window.__audio.tones.at(-1))).toEqual({ start: 200, end: 50, type: 'sawtooth' });
  expect(await page.evaluate(() => window.__audio.noise)).toBe(1);
  await page.clock.runFor(1000); expect(await page.evaluate(() => window.__audio.tones.length)).toBe(3);
  await mute.focus(); await page.keyboard.press('Space');
  await expect(mute).toHaveText('音效：关闭 · 取消静音'); await expect(mute).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '再来一局' }).click();
  await page.evaluate(() => window.__snake.load({ ...window.__snake.state(), food: { x: 13, y: 12 } }));
  await page.clock.runFor(250); expect(await page.evaluate(() => window.__audio.tones.length)).toBe(3);
  await mute.click(); await expect(mute).toHaveAttribute('aria-pressed', 'false');
  await page.evaluate(() => window.__snake.load({ ...window.__snake.state(), food: { x: 14, y: 12 } }));
  await page.clock.runFor(250); expect(await page.evaluate(() => window.__audio.tones.length)).toBe(4);
  expect(await page.evaluate(() => window.__audio.contexts.length)).toBe(1);
});
test('渐变蛇身、圆角间距、鳞片、头部发光和四向眼睛实际绘制正确', async ({ page }) => {
  await page.evaluate(() => window.__snake.load({
    snake: Array.from({ length: 9 }, (_, i) => ({ x: 15 - i, y: 15 })),
    direction: 'right', phase: 'running', food: null, score: 6,
  }));
  const pixels = await page.locator('canvas').evaluate(canvas => {
    const ctx = (canvas as HTMLCanvasElement).getContext('2d')!;
    const ratio = window.devicePixelRatio;
    const at = (x: number, y: number) => Array.from(ctx.getImageData(Math.floor(x * ratio), Math.floor(y * ratio), 1, 1).data).slice(0, 3);
    return { head: at(465, 465), tail: at(211, 465), middle: at(331, 465),
      corner: at(210, 450), gap: at(239.5, 465), body: at(238, 465),
      glow: at(485, 465), background: at(500, 465),
      texture: at(334, 457), plain: at(334, 459) };
  });
  expect(pixels.head).toEqual([0, 255, 136]);
  expect(pixels.tail).toEqual([0, 102, 51]);
  expect(pixels.middle[1]).toBeGreaterThan(pixels.tail[1]);
  expect(pixels.middle[1]).toBeLessThan(pixels.head[1]);
  expect(pixels.corner[1]).toBeLessThan(pixels.tail[1]);
  expect(pixels.gap[1]).toBeLessThan(pixels.body[1]);
  expect(pixels.glow[1]).toBeGreaterThan(pixels.background[1]);
  expect(pixels.texture).not.toEqual(pixels.plain);
  for (const direction of ['up', 'down', 'left', 'right'] as const) {
    await page.evaluate(direction => window.__snake.load({ ...window.__snake.state(), direction }), direction);
    const eyes = await page.locator('canvas').evaluate((canvas, direction) => {
      const ctx = (canvas as HTMLCanvasElement).getContext('2d')!;
      const vertical = direction === 'up' || direction === 'down';
      const forward = direction === 'up' || direction === 'left' ? -1 : 1;
      const at = (x: number, y: number) => Array.from(ctx.getImageData(Math.floor(x * window.devicePixelRatio), Math.floor(y * window.devicePixelRatio), 1, 1).data).slice(0, 3);
      return [-1, 1].map(side => {
        const x = 450 + 30 * (.5 + (vertical ? side * .18 : forward * .2));
        const y = 450 + 30 * (.5 + (vertical ? forward * .2 : side * .18));
        return { white: at(x - (vertical ? 0 : forward * 2), y - (vertical ? forward * 2 : 0)), black: at(x + (vertical ? 0 : forward), y + (vertical ? forward : 0)) };
      });
    }, direction);
    for (const eye of eyes) {
      expect(eye.white.every(channel => channel > 230)).toBe(true);
      expect(eye.black.every(channel => channel < 40)).toBe(true);
    }
  }
  await page.screenshot({ path: `test-results/snake-${test.info().project.name}.png`, fullPage: true });
});
test('完整开始、输入、暂停、结束与重开流程', async ({ page }) => {
  await expect(page.locator('#status')).toHaveText('准备开始');
  await expect(page.locator('.board-top')).toContainText('25 × 25');
  await expect(page.locator('.board-bottom')).toContainText('250 ms / 格');
  expect(await page.locator('canvas').evaluate(c => (c as HTMLCanvasElement).width / window.devicePixelRatio)).toBe(750);
  await page.screenshot({ path: `test-results/ready-${test.info().project.name}.png`, fullPage: true });
  await page.clock.runFor(1000); expect(await page.evaluate(() => window.__snake.state().snake[0])).toEqual({ x: 12, y: 12 });
  await page.getByRole('button', { name: '开始游戏' }).click();
  await page.clock.runFor(249);
  expect(await page.evaluate(() => window.__snake.state().snake[0])).toEqual({ x: 12, y: 12 });
  await page.clock.runFor(1);
  expect(await page.evaluate(() => window.__snake.state().snake[0])).toEqual({ x: 13, y: 12 });
  await page.getByRole('button', { name: '重新开始' }).click();
  await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowUp'); await page.keyboard.press('ArrowLeft');
  await page.clock.runFor(250); expect(await page.evaluate(() => window.__snake.state().snake[0])).toEqual({ x: 12, y: 11 });
  await page.keyboard.press('a'); await page.clock.runFor(250);
  expect(await page.evaluate(() => window.__snake.state().snake[0])).toEqual({ x: 11, y: 11 });
  await page.keyboard.press('s'); await page.clock.runFor(250); await page.keyboard.press('d'); await page.clock.runFor(250);
  await page.keyboard.press('w'); await page.clock.runFor(250);
  await page.keyboard.down('Space'); await page.keyboard.down('Space'); await page.keyboard.up('Space'); await expect(page.locator('#status')).toHaveText('已暂停');
  const snapshot = await page.locator('canvas').evaluate(c => (c as HTMLCanvasElement).toDataURL());
  await page.keyboard.press('a'); await page.clock.runFor(1000);
  expect(await page.locator('canvas').evaluate(c => (c as HTMLCanvasElement).toDataURL())).toBe(snapshot);
  await page.getByRole('button', { name: '继续游戏', exact: true }).last().focus();
  const pausedSnake = await page.evaluate(() => window.__snake.state().snake);
  await page.keyboard.press('Space'); await expect(page.locator('#status')).toHaveText('进行中');
  await page.clock.runFor(249); expect(await page.evaluate(() => window.__snake.state().snake)).toEqual(pausedSnake);
  await page.clock.runFor(1); await page.getByRole('button', { name: '暂停游戏', exact: true }).click();
  await expect(page.locator('#status')).toHaveText('已暂停');
  await page.getByRole('button', { name: '继续游戏', exact: true }).first().click();
  await page.clock.runFor(3000); await expect(page.locator('#status')).toHaveText('游戏结束');
  await expect(page.locator('#overlay-text')).toContainText('最终得分');
  await page.getByRole('button', { name: '再来一局' }).click();
  await expect(page.locator('#score')).toHaveText('0'); await expect(page.locator('#status')).toHaveText('进行中');
  expect(await page.evaluate(() => window.__snake.state().snake[0])).toEqual({ x: 12, y: 12 });
  const scroll = await page.evaluate(() => window.scrollY); await page.keyboard.press('ArrowDown'); expect(await page.evaluate(() => window.scrollY)).toBe(scroll);
});
test('食物连续动画、吃到后的爆散、暂停冻结和重开清理', async ({ page }) => {
  await page.getByRole('button', { name: '开始游戏' }).click();
  await page.evaluate(() => window.__snake.load({ ...window.__snake.state(), food: { x: 5, y: 5 } }));
  const image = () => page.locator('canvas').evaluate(c => (c as HTMLCanvasElement).toDataURL());
  const first = await image(); const snake = await page.evaluate(() => window.__snake.state().snake);
  await page.clock.runFor(125); expect(await image()).not.toBe(first);
  expect(await page.evaluate(() => window.__snake.state().snake)).toEqual(snake);
  await page.getByRole('button', { name: '暂停游戏', exact: true }).click();
  const paused = await image(); const time = await page.evaluate(() => window.__snake.effects().time);
  await page.clock.runFor(1000); expect(await image()).toBe(paused);
  expect(await page.evaluate(() => window.__snake.effects().time)).toBe(time);
  await page.evaluate(() => window.__snake.load({ ...window.__snake.state(), phase: 'running', food: { x: 13, y: 12 } }));
  await page.clock.runFor(250); await expect(page.locator('#score')).toHaveText('1');
  const burst = await page.evaluate(() => window.__snake.effects().particles);
  expect(burst).toHaveLength(24); expect(new Set(burst.map(p => p.color))).toEqual(new Set(['#ffd166', '#ff4d4d']));
  await page.clock.runFor(100);
  const later = await page.evaluate(() => window.__snake.effects().particles);
  expect(later[0].x).toBeGreaterThan(burst[0].x); expect(later[0].alpha).toBeLessThan(burst[0].alpha);
  await page.screenshot({ path: `test-results/food-effects-${test.info().project.name}.png`, fullPage: true });
  await page.getByRole('button', { name: '暂停游戏', exact: true }).click();
  const frozen = await page.evaluate(() => window.__snake.effects());
  await page.clock.runFor(1000); expect(await page.evaluate(() => window.__snake.effects())).toEqual(frozen);
  await page.getByRole('button', { name: '继续游戏', exact: true }).last().click();
  await page.clock.runFor(800); expect(await page.evaluate(() => window.__snake.effects().particles)).toEqual([]);
  await page.evaluate(() => window.__snake.load({ ...window.__snake.state(), food: { x: window.__snake.state().snake[0].x + 1, y: 12 } }));
  await page.clock.runFor(250); expect(await page.evaluate(() => window.__snake.effects().particles.length)).toBe(24);
  await page.getByRole('button', { name: '重新开始' }).click();
  expect(await page.evaluate(() => window.__snake.effects().particles)).toEqual([]);
  await expect(page.locator('#score')).toHaveText('0');
});
test('吃食物得分与满盘胜利反馈', async ({ page }) => {
  await page.getByRole('button', { name: '开始游戏' }).click();
  await page.evaluate(() => window.__snake.load({ ...window.__snake.state(), food: { x: 13, y: 12 } }));
  await page.clock.runFor(250); await expect(page.locator('#score')).toHaveText('1');
  const state = await page.evaluate(() => window.__snake.state()); expect(state.snake.length).toBe(4);
  await page.evaluate(() => {
    const snake = [{ x: 23, y: 0 }];
    for (let y = 0; y < 25; y++) for (let x = 0; x < 25; x++) if (!(y === 0 && (x === 23 || x === 24))) snake.push({ x, y });
    window.__snake.load({ snake, direction: 'right', food: { x: 24, y: 0 }, score: 621, phase: 'running' });
  });
  await page.clock.runFor(250); await expect(page.locator('#status')).toHaveText('胜利'); await expect(page.locator('#score')).toHaveText('622');
  await expect(page.locator('#overlay-text')).toContainText('最终得分：622');
  await page.clock.runFor(1000); expect((await page.evaluate(() => window.__snake.state())).food).toBeNull();
  await page.getByRole('button', { name: '重新开始' }).click(); await expect(page.locator('#score')).toHaveText('0');
});
