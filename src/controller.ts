import { initial, step } from './game/engine';
import { PERIOD } from './game/config';
import type { State } from './game/types';
import { Input } from './input';
export class Controller {
  state = initial();
  input = new Input();
  private timer: ReturnType<typeof setInterval> | undefined;
  constructor(private changed: (state: State) => void, private random = Math.random) {}
  private stop() { clearInterval(this.timer); this.timer = undefined; this.input.clear(); }
  private run() {
    this.stop();
    this.timer = setInterval(() => {
      this.state = step(this.state, this.input.pending, this.random);
      this.input.clear();
      if (this.state.phase !== 'running') this.stop();
      this.changed(this.state);
    }, PERIOD);
  }
  start() { this.state = initial('running', this.random); this.run(); this.changed(this.state); }
  toggle() {
    if (this.state.phase === 'running') { this.stop(); this.state = { ...this.state, phase: 'paused' }; }
    else if (this.state.phase === 'paused') { this.state = { ...this.state, phase: 'running' }; this.run(); }
    else return;
    this.changed(this.state);
  }
  load(state: State) { this.stop(); this.state = state; if (state.phase === 'running') this.run(); this.changed(this.state); }
  dispose() { this.stop(); }
}
