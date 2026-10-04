import { describe, it, expect, vi, afterEach } from 'vitest';
import { foodFor, initial, step, same } from '../../src/game/engine';
import { Input, keys } from '../../src/input';
import { Controller } from '../../src/controller';
import type { State } from '../../src/game/types';
import { SIZE, PERIOD, CELL_SIZE, CANVAS_SIZE } from '../../src/game/config';
const running = (): State => initial('running', () => 0);
afterEach(() => vi.useRealTimers());
describe('游戏规则', () => {
  it('使用更大的棋盘和更慢的固定速度，新增边缘格可正常移动和生成食物', () => {
    expect(SIZE).toBe(25); expect(PERIOD).toBe(250); expect(CELL_SIZE).toBe(28); expect(CANVAS_SIZE).toBe(700);
    const state = { ...running(), snake: [{ x: 23, y: 24 }, { x: 22, y: 24 }, { x: 21, y: 24 }] };
    expect(step(state)).toMatchObject({ phase: 'running', snake: [{ x: 24, y: 24 }, { x: 23, y: 24 }, { x: 22, y: 24 }] });
    expect(foodFor(state.snake, () => .99999)).toEqual({ x: 24, y: 24 });
    expect(step(step(state)).phase).toBe('gameOver');
  });
  it('初始化、普通移动与反向保护', () => {
    expect(initial().phase).toBe('ready');
    const state = running();
    expect(state).toMatchObject({ direction: 'right', score: 0, snake: [{ x: 12, y: 12 }, { x: 11, y: 12 }, { x: 10, y: 12 }] });
    expect(step(state, 'left').snake[0]).toEqual({ x: 13, y: 12 });
    expect(step(state).snake).toHaveLength(3);
    expect(state.snake[0]).toEqual({ x: 12, y: 12 });
  });
  it('增长与食物始终处于空格', () => {
    const state = running(); state.food = { x: 13, y: 12 };
    const next = step(state, 'right', () => .5);
    expect(next.score).toBe(1); expect(next.snake).toHaveLength(4);
    expect(next.snake.some(p => same(p, next.food!))).toBe(false);
    for (const random of [0, .2, .7, .999]) expect(state.snake.some(p => same(p, foodFor(state.snake, () => random)!))).toBe(false);
    expect(foodFor([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }], () => 0, 2)).toEqual({ x: 1, y: 1 });
    expect(foodFor([{ x: 0, y: 0 }], () => 0, 1)).toBeNull();
  });
  it('墙与身体碰撞结束，终止后不再移动', () => {
    const state = running(); state.snake[0] = { x: 24, y: 12 };
    const ended = step(state); expect(ended.phase).toBe('gameOver'); expect(step(ended)).toBe(ended);
    const body = { ...running(), snake: [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 1, y: 2 }] };
    expect(step(body).phase).toBe('gameOver');
  });
  it('可移动到即将移走的尾格，吃食物时尾格仍占用', () => {
    const state: State = { ...running(), direction: 'left', snake: [{ x: 1, y: 1 }, { x: 1, y: 2 }, { x: 0, y: 2 }, { x: 0, y: 1 }] };
    expect(step(state).phase).toBe('running');
    expect(step({ ...state, food: { x: 0, y: 1 } }).phase).toBe('gameOver');
  });
  it('满盘胜利不再请求随机数', () => {
    const random = vi.fn();
    const state: State = { snake: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }], direction: 'right', food: { x: 1, y: 0 }, phase: 'running', score: 0 };
    const next = step(state, 'right', random, 2);
    expect(next).toMatchObject({ phase: 'won', score: 1, food: null }); expect(random).not.toHaveBeenCalled(); expect(step(next)).toBe(next);
  });
  it('所有非运行阶段忽略推进', () => {
    for (const phase of ['ready', 'paused', 'gameOver', 'won'] as const) { const state = { ...running(), phase }; expect(step(state)).toBe(state); }
  });
  it('快速连续输入最多接受一次有效转向，无效输入不占机会', () => {
    const input = new Input(); input.accept('left', 'right'); input.accept('right', 'right'); input.accept('up', 'right'); input.accept('left', 'right');
    expect(input.pending).toBe('up'); input.clear(); input.accept('left', 'up'); expect(input.pending).toBe('left');
    expect(keys.w).toBe(keys.ArrowUp); expect(keys.a).toBe(keys.ArrowLeft); expect(keys.s).toBe(keys.ArrowDown); expect(keys.d).toBe(keys.ArrowRight);
  });
  it('暂停冻结、继续等待完整周期，重开清空输入与分数且只有一个计时器', () => {
    vi.useFakeTimers(); const game = new Controller(vi.fn(), () => 0);
    game.start(); game.input.accept('up', 'right'); vi.advanceTimersByTime(50); game.toggle(); const paused = game.state;
    expect(game.input.pending).toBeUndefined(); expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(1000); expect(game.state).toBe(paused);
    game.toggle(); vi.advanceTimersByTime(249); expect(game.state.snake).toBe(paused.snake);
    vi.advanceTimersByTime(1); expect(game.state.snake[0]).toEqual({ x: 13, y: 12 });
    game.state.score = 8; game.input.accept('up', 'right'); game.start(); game.start();
    expect(vi.getTimerCount()).toBe(1); expect(game.input.pending).toBeUndefined(); expect(game.state.score).toBe(0);
    vi.advanceTimersByTime(250); expect(game.state.snake[0]).toEqual({ x: 13, y: 12 });
    vi.advanceTimersByTime(3000); expect(game.state.phase).toBe('gameOver'); expect(vi.getTimerCount()).toBe(0); game.dispose();
  });
  it('反复暂停与继续不会叠加计时器，待开始切换无效果', () => {
    vi.useFakeTimers(); const changed = vi.fn(); const game = new Controller(changed);
    game.toggle(); expect(game.state.phase).toBe('ready'); expect(changed).not.toHaveBeenCalled();
    game.start();
    for (let i = 0; i < 10; i++) { game.toggle(); expect(vi.getTimerCount()).toBe(0); game.toggle(); expect(vi.getTimerCount()).toBe(1); }
    vi.advanceTimersByTime(250); expect(game.state.snake[0]).toEqual({ x: 13, y: 12 }); game.dispose(); expect(vi.getTimerCount()).toBe(0);
  });
});
