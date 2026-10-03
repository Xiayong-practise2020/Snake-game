import { expect, it, vi } from 'vitest';
import { GameAudio, transitionSounds } from '../../src/audio';
import { initial } from '../../src/game/engine';

function fixture() {
  const parameter = () => ({ value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() });
  const node = () => ({ connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(), onended: null as null | (() => void) });
  const gains: ReturnType<typeof parameter>[] = [];
  const tones: (ReturnType<typeof node> & { frequency: ReturnType<typeof parameter>; type: string })[] = [];
  const noise = node(), filter = { ...node(), frequency: parameter(), type: '' };
  const context = { state: 'running', currentTime: 10, sampleRate: 8000, destination: {},
    resume: vi.fn().mockResolvedValue(undefined), close: vi.fn().mockResolvedValue(undefined),
    createGain: vi.fn(() => { const gain = parameter(); gains.push(gain); return { ...node(), gain }; }),
    createOscillator: vi.fn(() => { const tone = { ...node(), frequency: parameter(), type: '' }; tones.push(tone); return tone; }),
    createBufferSource: vi.fn(() => noise), createBiquadFilter: vi.fn(() => filter),
    createBuffer: vi.fn((channels: number, length: number) => ({ getChannelData: () => new Float32Array(length) })),
  };
  const factory = vi.fn(() => context as unknown as AudioContext);
  return { audio: new GameAudio(factory), context, factory, tones, noise, gains, filter };
}

it('默认开启但首次交互才初始化，共用一个上下文并恢复暂停的上下文', async () => {
  const f = fixture(); expect(f.audio.muted).toBe(false); f.audio.play('eat'); expect(f.factory).not.toHaveBeenCalled();
  f.context.state = 'suspended'; await f.audio.unlock(); await f.audio.unlock();
  expect(f.factory).toHaveBeenCalledTimes(1); expect(f.context.resume).toHaveBeenCalled();
});
it('叮咚从400升到800，死亡从200降到50并叠加低通噪声，转向嘀声短且轻', async () => {
  const f = fixture(); await f.audio.unlock(); f.audio.play('eat'); f.audio.play('death'); f.audio.play('turn');
  expect(f.tones[0].frequency.setValueAtTime).toHaveBeenCalledWith(400, 10);
  expect(f.tones[0].frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(800, 10.24);
  expect(f.tones[1].frequency.setValueAtTime).toHaveBeenCalledWith(200, 10);
  expect(f.tones[1].frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(50, 10.45);
  expect(f.tones[1].type).toBe('sawtooth'); expect(f.noise.start).toHaveBeenCalled(); expect(f.filter.type).toBe('lowpass');
  expect(f.tones[2].stop).toHaveBeenCalledWith(10.045);
  expect(f.gains[4].exponentialRampToValueAtTime).toHaveBeenCalledWith(.035, 10.005);
  for (const tone of f.tones) { tone.onended!(); expect(tone.disconnect).toHaveBeenCalled(); }
});
it('静音立即停止在播音效并阻止新音效，取消静音恢复且释放上下文', async () => {
  const f = fixture(); await f.audio.unlock(); f.audio.play('eat'); f.audio.toggle();
  expect(f.audio.muted).toBe(true); expect(f.gains[0].setValueAtTime).toHaveBeenCalledWith(0, 10);
  expect(f.tones[0].stop).toHaveBeenCalledWith(); f.audio.play('turn'); expect(f.tones).toHaveLength(1);
  f.audio.toggle(); f.audio.play('turn'); expect(f.tones).toHaveLength(2);
  f.audio.dispose(); expect(f.context.close).toHaveBeenCalled();
});
it('静音启动不创建上下文，音频不可用或恢复失败不会中断游戏', async () => {
  const f = fixture(); f.audio.toggle(); await f.audio.unlock(); expect(f.factory).not.toHaveBeenCalled();
  const broken = new GameAudio(() => { throw new Error('unavailable'); }); await expect(broken.unlock()).resolves.toBeUndefined();
  f.audio.toggle(); f.context.state = 'suspended'; f.context.resume.mockRejectedValue(new Error('blocked'));
  await expect(f.audio.unlock()).resolves.toBeUndefined(); f.audio.play('death'); expect(f.tones).toHaveLength(0);
});
it('仅实际转向、吃食物和首次死亡产生音效，暂停、重开和结束后不重复', () => {
  const previous = initial('running');
  expect(transitionSounds(previous, { ...previous })).toEqual([]);
  expect(transitionSounds(previous, { ...previous, direction: 'up', score: 1 })).toEqual(['turn', 'eat']);
  expect(transitionSounds(previous, { ...previous, phase: 'gameOver' })).toEqual(['death']);
  expect(transitionSounds(previous, { ...previous, phase: 'won', score: 1 })).toEqual(['eat']);
  expect(transitionSounds(previous, { ...previous, phase: 'paused' })).toEqual([]);
  expect(transitionSounds(undefined, previous)).toEqual([]);
  expect(transitionSounds({ ...previous, phase: 'gameOver' }, previous)).toEqual([]);
});
