import { SIZE, CANVAS_SIZE } from './game/config';
import type { State } from './game/types';

export function segmentColor(index: number, length: number): string {
  const progress = length <= 1 ? 0 : index / (length - 1);
  const green = Math.round(255 + (102 - 255) * progress);
  const blue = Math.round(136 + (51 - 136) * progress);
  return `#00${green.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}`;
}

function drawSnake(ctx: CanvasRenderingContext2D, state: State, cell: number) {
  // Draw the head last so its glow and eyes remain above the adjoining body.
  for (let i = state.snake.length - 1; i >= 0; i--) {
    const point = state.snake[i];
    const x = point.x * cell, y = point.y * cell;
    ctx.save();
    ctx.fillStyle = segmentColor(i, state.snake.length);
    if (i === 0) { ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 14; }
    ctx.beginPath();
    // Half a logical pixel on each edge gives adjacent segments a 1 px gap.
    ctx.roundRect(x + .5, y + .5, cell - 1, cell - 1, 7);
    ctx.fill();
    ctx.shadowBlur = 0;
    if (i > 0) {
      ctx.clip();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)'; ctx.lineWidth = .7;
      for (let row = 0; row < 3; row++) {
        for (let column = 0; column < 4; column++) {
          ctx.beginPath();
          ctx.arc(x + 4 + column * 8 + (row % 2) * 4, y + 4 + row * 8, 3.5, .15 * Math.PI, .85 * Math.PI);
          ctx.stroke();
        }
      }
    } else {
      const vertical = state.direction === 'up' || state.direction === 'down';
      const forward = state.direction === 'up' || state.direction === 'left' ? -1 : 1;
      for (const side of [-1, 1]) {
        const eyeX = x + cell * (.5 + (vertical ? side * .18 : forward * .2));
        const eyeY = y + cell * (.5 + (vertical ? forward * .2 : side * .18));
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(eyeX, eyeY, 3.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000000'; ctx.beginPath();
        ctx.arc(eyeX + (vertical ? 0 : forward), eyeY + (vertical ? forward : 0), 1.5, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }
}

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
  drawSnake(ctx, state, cell);
  if (state.food) {
    ctx.fillStyle = '#f5a581'; ctx.beginPath(); ctx.arc((state.food.x + .5) * cell, (state.food.y + .5) * cell, 9, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#d9f99d'; ctx.beginPath(); ctx.moveTo((state.food.x + .5) * cell, state.food.y * cell + 7); ctx.lineTo((state.food.x + .65) * cell, state.food.y * cell + 4); ctx.stroke();
  }
}
