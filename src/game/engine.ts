import { SIZE } from './config';
import type { Direction, Point, State } from './types';
export const same = (a: Point, b: Point) => a.x === b.x && a.y === b.y;
export const opposite: Record<Direction, Direction> = { up: 'down', down: 'up', left: 'right', right: 'left' };
export function foodFor(snake: Point[], random = Math.random, size = SIZE): Point | null {
  const free: Point[] = [];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    if (!snake.some(p => same(p, { x, y }))) free.push({ x, y });
  }
  return free.length ? free[Math.min(free.length - 1, Math.floor(random() * free.length))] : null;
}
export function initial(phase: State['phase'] = 'ready', random = Math.random): State {
  const snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
  return { snake, direction: 'right', food: foodFor(snake, random), score: 0, phase };
}
export function step(state: State, requested = state.direction, random = Math.random, size = SIZE): State {
  if (state.phase !== 'running') return state;
  const direction = requested === opposite[state.direction] ? state.direction : requested;
  const delta = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[direction];
  const head = { x: state.snake[0].x + delta[0], y: state.snake[0].y + delta[1] };
  const eating = state.food !== null && same(head, state.food);
  const body = eating ? state.snake : state.snake.slice(0, -1);
  if (head.x < 0 || head.y < 0 || head.x >= size || head.y >= size || body.some(p => same(p, head))) return { ...state, direction, phase: 'gameOver' };
  const snake = [head, ...body];
  const won = snake.length === size * size;
  return { snake, direction, score: state.score + Number(eating), phase: won ? 'won' : 'running', food: won ? null : eating ? foodFor(snake, random, size) : state.food };
}
