import { opposite } from './game/engine';
import type { Direction } from './game/types';
export const keys: Record<string, Direction> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
export class Input {
  pending: Direction | undefined;
  accept(direction: Direction, current: Direction) {
    if (!this.pending && direction !== current && direction !== opposite[current]) this.pending = direction;
  }
  clear() { this.pending = undefined; }
}
