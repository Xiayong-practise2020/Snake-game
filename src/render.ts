import { SIZE, CANVAS_SIZE } from './game/config';
import type { State } from './game/types';
export function draw(canvas: HTMLCanvasElement, state: State) {
  const width = CANVAS_SIZE, cell = width / SIZE, ratio = window.devicePixelRatio || 1;
  canvas.width = width * ratio; canvas.height = width * ratio;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(ratio, ratio);
  ctx.fillStyle = '#14251e'; ctx.fillRect(0, 0, width, width);
  ctx.strokeStyle = '#20352b'; ctx.lineWidth = 1;
  for (let i = 0; i <= SIZE; i++) {
    ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, width); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * cell); ctx.lineTo(width, i * cell); ctx.stroke();
  }
  state.snake.forEach((p, i) => {
    ctx.fillStyle = i === 0 ? '#d9f99d' : '#84bd73';
    ctx.beginPath(); ctx.roundRect(p.x * cell + 3, p.y * cell + 3, cell - 6, cell - 6, i === 0 ? 7 : 5); ctx.fill();
    if (i === 0) {
      ctx.fillStyle = '#20352b';
      const vertical = state.direction === 'up' || state.direction === 'down';
      const offset = state.direction === 'up' || state.direction === 'left' ? 10 : 20;
      for (const side of [10, 20]) { ctx.beginPath(); ctx.arc(p.x * cell + (vertical ? side : offset), p.y * cell + (vertical ? offset : side), 2, 0, Math.PI * 2); ctx.fill(); }
    }
  });
  if (state.food) {
    ctx.fillStyle = '#f5a581'; ctx.beginPath(); ctx.arc((state.food.x + .5) * cell, (state.food.y + .5) * cell, 9, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#d9f99d'; ctx.beginPath(); ctx.moveTo((state.food.x + .5) * cell, state.food.y * cell + 7); ctx.lineTo((state.food.x + .65) * cell, state.food.y * cell + 4); ctx.stroke();
  }
}
