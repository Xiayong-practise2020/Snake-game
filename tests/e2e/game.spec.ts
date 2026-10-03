import { test, expect } from '@playwright/test';
import type { State } from '../../src/game/types';
declare global { interface Window { __snake: { state(): State; load(state: State): void } } }
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  await page.goto('/');
});
test('完整开始、输入、暂停、结束与重开流程', async ({ page }) => {
  await expect(page.locator('#status')).toHaveText('准备开始');
  await page.screenshot({ path: `test-results/ready-${test.info().project.name}.png`, fullPage: true });
  await page.clock.runFor(1000); expect(await page.evaluate(() => window.__snake.state().snake[0])).toEqual({ x: 10, y: 10 });
  await page.getByRole('button', { name: '开始游戏' }).click();
  await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowUp'); await page.keyboard.press('ArrowLeft');
  await page.clock.runFor(150); expect(await page.evaluate(() => window.__snake.state().snake[0])).toEqual({ x: 10, y: 9 });
  await page.keyboard.press('a'); await page.clock.runFor(150);
  expect(await page.evaluate(() => window.__snake.state().snake[0])).toEqual({ x: 9, y: 9 });
  await page.keyboard.press('s'); await page.clock.runFor(150); await page.keyboard.press('d'); await page.clock.runFor(150);
  await page.keyboard.press('w'); await page.clock.runFor(150);
  await page.keyboard.down('Space'); await page.keyboard.down('Space'); await page.keyboard.up('Space'); await expect(page.locator('#status')).toHaveText('已暂停');
  const snapshot = await page.locator('canvas').evaluate(c => (c as HTMLCanvasElement).toDataURL());
  await page.keyboard.press('a'); await page.clock.runFor(1000);
  expect(await page.locator('canvas').evaluate(c => (c as HTMLCanvasElement).toDataURL())).toBe(snapshot);
  await page.getByRole('button', { name: '继续游戏', exact: true }).last().focus();
  await page.keyboard.press('Space'); await expect(page.locator('#status')).toHaveText('进行中');
  await page.clock.runFor(149); expect(await page.locator('canvas').evaluate(c => (c as HTMLCanvasElement).toDataURL())).toBe(snapshot);
  await page.clock.runFor(1); await page.getByRole('button', { name: '暂停游戏', exact: true }).click();
  await expect(page.locator('#status')).toHaveText('已暂停');
  await page.getByRole('button', { name: '继续游戏', exact: true }).first().click();
  await page.clock.runFor(3000); await expect(page.locator('#status')).toHaveText('游戏结束');
  await expect(page.locator('#overlay-text')).toContainText('最终得分');
  await page.getByRole('button', { name: '再来一局' }).click();
  await expect(page.locator('#score')).toHaveText('0'); await expect(page.locator('#status')).toHaveText('进行中');
  expect(await page.evaluate(() => window.__snake.state().snake[0])).toEqual({ x: 10, y: 10 });
  const scroll = await page.evaluate(() => window.scrollY); await page.keyboard.press('ArrowDown'); expect(await page.evaluate(() => window.scrollY)).toBe(scroll);
});
test('吃食物得分与满盘胜利反馈', async ({ page }) => {
  await page.getByRole('button', { name: '开始游戏' }).click();
  await page.evaluate(() => window.__snake.load({ ...window.__snake.state(), food: { x: 11, y: 10 } }));
  await page.clock.runFor(150); await expect(page.locator('#score')).toHaveText('1');
  const state = await page.evaluate(() => window.__snake.state()); expect(state.snake.length).toBe(4);
  await page.evaluate(() => {
    const snake = [{ x: 18, y: 0 }];
    for (let y = 0; y < 20; y++) for (let x = 0; x < 20; x++) if (!(y === 0 && (x === 18 || x === 19))) snake.push({ x, y });
    window.__snake.load({ snake, direction: 'right', food: { x: 19, y: 0 }, score: 396, phase: 'running' });
  });
  await page.clock.runFor(150); await expect(page.locator('#status')).toHaveText('胜利'); await expect(page.locator('#score')).toHaveText('397');
  await expect(page.locator('#overlay-text')).toContainText('最终得分：397');
  await page.clock.runFor(1000); expect((await page.evaluate(() => window.__snake.state())).food).toBeNull();
  await page.getByRole('button', { name: '重新开始' }).click(); await expect(page.locator('#score')).toHaveText('0');
});
