import './style.css';
import { Controller } from './controller';
import { keys } from './input';
import { draw } from './render';
import type { State } from './game/types';
import { SIZE, PERIOD } from './game/config';
document.querySelector('#app')!.innerHTML = `
<header><a class="brand" href="./" aria-label="青蛇首页"><span class="mark">↳</span> 青蛇<span class="english">SNAKE</span></a><span class="edition">经典玩法 · 专注当下</span></header>
<section class="intro"><div><p class="eyebrow">A LITTLE BREAK, A LITTLE PLAY</p><h1>再吃一口。</h1><p class="subtitle">循着方向，慢慢长大。把这一格，留给快乐。</p></div><div class="scorecard"><span>本局得分</span><strong id="score">0</strong><small>每一口 +1</small></div></section>
<section class="game-layout"><div class="board-shell"><div class="board-top"><span><i id="status-dot"></i><span id="status" role="status" aria-live="polite">准备开始</span></span><span>${SIZE} × ${SIZE}</span></div><div class="board"><canvas aria-label="贪吃蛇棋盘，使用方向键或 WASD 操作"></canvas><div id="overlay"><span class="overlay-icon">↳</span><h2 id="overlay-title">准备好出发了吗？</h2><p id="overlay-text">从一小段开始，探索整片绿意。</p><button id="primary">开始游戏 <span>↗</span></button></div></div><div class="board-bottom"><span>● <span class="legend">青蛇</span> <span class="food-dot">●</span> <span class="legend">食物</span></span><span>固定速度 · ${PERIOD} ms / 格</span></div></div>
<aside><p class="eyebrow">HOW TO PLAY</p><h2>简单三步，<br>快乐一局。</h2><div class="instruction"><span class="number">01</span><div><h3>掌握方向</h3><p>方向键或 WASD 控制移动。<br>蛇不能直接向反方向转身。</p><div class="key-row"><kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd></div><div class="key-row"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></div></div></div><div class="instruction"><span class="number">02</span><div><h3>吃一点，长一点</h3><p>每吃一个食物，增长一格、加 1 分。<br>填满棋盘，就赢下这一局。</p></div></div><div class="instruction"><span class="number">03</span><div><h3>给自己留点空间</h3><p>避开墙壁和自己的身体。<br>随时按 <kbd>空格</kbd> 暂停，喘口气。</p></div></div><div class="actions"><button id="pause" disabled>暂停游戏</button><button id="restart" disabled>重新开始 ↻</button></div><p class="note">不必赶路，找到自己的节奏。</p></aside></section><footer><span>小小棋盘，大大乐趣。</span><span>为键盘玩家设计 / SINGLE PLAYER</span></footer>`;
const canvas = document.querySelector('canvas')!;
const primary = document.querySelector<HTMLButtonElement>('#primary')!;
const pause = document.querySelector<HTMLButtonElement>('#pause')!;
const restart = document.querySelector<HTMLButtonElement>('#restart')!;
const texts = { ready: ['准备开始', '准备好出发了吗？', '从一小段开始，探索整片绿意。', '开始游戏 ↗'], running: ['进行中', '', '', ''], paused: ['已暂停', '休息一下。', '棋盘会在这里，等你继续。', '继续游戏 ↗'], gameOver: ['游戏结束', '这一局，到这里。', '再试一次，走得更远。', '再来一局 ↗'], won: ['胜利', '整片绿意，都属于你！', '你填满了棋盘，漂亮的一局。', '再来一局 ↗'] };
function render(state: State) {
  draw(canvas, state);
  const [status, title, description, action] = texts[state.phase];
  document.querySelector('#score')!.textContent = String(state.score);
  document.querySelector('#status')!.textContent = status;
  document.querySelector<HTMLElement>('#overlay')!.hidden = state.phase === 'running';
  document.querySelector('#overlay-title')!.textContent = title;
  document.querySelector('#overlay-text')!.textContent = ['gameOver', 'won'].includes(state.phase) ? `${description} 最终得分：${state.score}` : description;
  primary.textContent = action;
  pause.disabled = !['running', 'paused'].includes(state.phase);
  pause.textContent = state.phase === 'paused' ? '继续游戏' : '暂停游戏';
  restart.disabled = state.phase === 'ready';
  document.querySelector('#status-dot')!.className = state.phase;
}
const game = new Controller(render);
primary.addEventListener('click', () => game.state.phase === 'paused' ? game.toggle() : game.start());
pause.addEventListener('click', () => game.toggle());
restart.addEventListener('click', () => game.start());
window.addEventListener('keydown', event => {
  const direction = keys[event.key] ?? keys[event.key.toLowerCase()];
  if (!direction && event.code !== 'Space') return;
  event.preventDefault();
  if (event.repeat) return;
  if (event.code === 'Space') game.toggle();
  else if (game.state.phase === 'running' && direction) game.input.accept(direction, game.state.direction);
});
window.addEventListener('pagehide', () => game.dispose());
render(game.state);
if (import.meta.env.MODE === 'test') {
  Object.assign(window, { __snake: { state: () => game.state, load: (state: State) => game.load(state) } });
}
