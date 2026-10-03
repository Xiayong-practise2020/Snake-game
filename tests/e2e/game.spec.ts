import { test, expect } from '@playwright/test';
import type { State } from '../../src/game/types';
declare global { interface Window { __snake: { state(): State; load(state: State): void } } }
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  // Pause before loading the game, allowing for slow browser startup on Windows.
  await page.clock.pauseAt(new Date('2026-01-02T00:00:00Z'));
  await page.goto('/');
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
  await expect(page.locator('.board-top')).toContainText('30 × 30');
  await expect(page.locator('.board-bottom')).toContainText('200 ms / 格');
  expect(await page.locator('canvas').evaluate(c => (c as HTMLCanvasElement).width / window.devicePixelRatio)).toBe(900);
  await page.screenshot({ path: `test-results/ready-${test.info().project.name}.png`, fullPage: true });
  await page.clock.runFor(1000); expect(await page.evaluate(() => window.__snake.state().snake[0])).toEqual({ x: 15, y: 15 });
  await page.getByRole('button', { name: '开始游戏' }).click();
  await page.clock.runFor(199);
  expect(await page.evaluate(() => window.__snake.state().snake[0])).toEqual({ x: 15, y: 15 });
  await page.clock.runFor(1);
  expect(await page.evaluate(() => window.__snake.state().snake[0])).toEqual({ x: 16, y: 15 });
  await page.getByRole('button', { name: '重新开始' }).click();
  await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowUp'); await page.keyboard.press('ArrowLeft');
  await page.clock.runFor(200); expect(await page.evaluate(() => window.__snake.state().snake[0])).toEqual({ x: 15, y: 14 });
  await page.keyboard.press('a'); await page.clock.runFor(200);
  expect(await page.evaluate(() => window.__snake.state().snake[0])).toEqual({ x: 14, y: 14 });
  await page.keyboard.press('s'); await page.clock.runFor(200); await page.keyboard.press('d'); await page.clock.runFor(200);
  await page.keyboard.press('w'); await page.clock.runFor(200);
  await page.keyboard.down('Space'); await page.keyboard.down('Space'); await page.keyboard.up('Space'); await expect(page.locator('#status')).toHaveText('已暂停');
  const snapshot = await page.locator('canvas').evaluate(c => (c as HTMLCanvasElement).toDataURL());
  await page.keyboard.press('a'); await page.clock.runFor(1000);
  expect(await page.locator('canvas').evaluate(c => (c as HTMLCanvasElement).toDataURL())).toBe(snapshot);
  await page.getByRole('button', { name: '继续游戏', exact: true }).last().focus();
  await page.keyboard.press('Space'); await expect(page.locator('#status')).toHaveText('进行中');
  await page.clock.runFor(199); expect(await page.locator('canvas').evaluate(c => (c as HTMLCanvasElement).toDataURL())).toBe(snapshot);
  await page.clock.runFor(1); await page.getByRole('button', { name: '暂停游戏', exact: true }).click();
  await expect(page.locator('#status')).toHaveText('已暂停');
  await page.getByRole('button', { name: '继续游戏', exact: true }).first().click();
  await page.clock.runFor(3000); await expect(page.locator('#status')).toHaveText('游戏结束');
  await expect(page.locator('#overlay-text')).toContainText('最终得分');
  await page.getByRole('button', { name: '再来一局' }).click();
  await expect(page.locator('#score')).toHaveText('0'); await expect(page.locator('#status')).toHaveText('进行中');
  expect(await page.evaluate(() => window.__snake.state().snake[0])).toEqual({ x: 15, y: 15 });
  const scroll = await page.evaluate(() => window.scrollY); await page.keyboard.press('ArrowDown'); expect(await page.evaluate(() => window.scrollY)).toBe(scroll);
});
test('吃食物得分与满盘胜利反馈', async ({ page }) => {
  await page.getByRole('button', { name: '开始游戏' }).click();
  await page.evaluate(() => window.__snake.load({ ...window.__snake.state(), food: { x: 16, y: 15 } }));
  await page.clock.runFor(200); await expect(page.locator('#score')).toHaveText('1');
  const state = await page.evaluate(() => window.__snake.state()); expect(state.snake.length).toBe(4);
  await page.evaluate(() => {
    const snake = [{ x: 28, y: 0 }];
    for (let y = 0; y < 30; y++) for (let x = 0; x < 30; x++) if (!(y === 0 && (x === 28 || x === 29))) snake.push({ x, y });
    window.__snake.load({ snake, direction: 'right', food: { x: 29, y: 0 }, score: 896, phase: 'running' });
  });
  await page.clock.runFor(200); await expect(page.locator('#status')).toHaveText('胜利'); await expect(page.locator('#score')).toHaveText('897');
  await expect(page.locator('#overlay-text')).toContainText('最终得分：897');
  await page.clock.runFor(1000); expect((await page.evaluate(() => window.__snake.state())).food).toBeNull();
  await page.getByRole('button', { name: '重新开始' }).click(); await expect(page.locator('#score')).toHaveText('0');
});
