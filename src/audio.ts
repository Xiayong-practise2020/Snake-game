import type { State } from './game/types';

export type Sound = 'eat' | 'death' | 'turn';
export function transitionSounds(previous: State | undefined, next: State): Sound[] {
  if (previous?.phase !== 'running') return [];
  if (next.phase === 'gameOver') return ['death'];
  const sounds: Sound[] = [];
  if (next.phase === 'running' && next.direction !== previous.direction) sounds.push('turn');
  if (next.score === previous.score + 1) sounds.push('eat');
  return sounds;
}

export class GameAudio {
  muted = false;
  private context: AudioContext | undefined;
  private master: GainNode | undefined;
  private voices = new Set<AudioScheduledSourceNode>();
  constructor(private factory: () => AudioContext = () => new AudioContext()) {}
  get state() { return this.context?.state ?? 'uninitialized'; }
  async unlock() {
    if (this.muted) return;
    try {
      if (!this.context || this.context.state === 'closed') {
        this.context = this.factory();
        this.master = this.context.createGain(); this.master.gain.value = .6;
        this.master.connect(this.context.destination);
      }
      if (this.context.state === 'suspended') await this.context.resume();
    } catch { /* Audio support or autoplay restrictions must not interrupt the game. */ }
  }
  toggle() {
    this.muted = !this.muted;
    if (this.context && this.master) this.master.gain.setValueAtTime(this.muted ? 0 : .6, this.context.currentTime);
    if (this.muted) this.stop();
  }
  private envelope(context: AudioContext, volume: number, duration: number) {
    const gain = context.createGain(), now = context.currentTime;
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + .005);
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    gain.connect(this.master!); return gain;
  }
  private track(source: AudioScheduledSourceNode, gain: GainNode, duration: number, filter?: AudioNode) {
    this.voices.add(source);
    source.onended = () => { this.voices.delete(source); source.disconnect(); gain.disconnect(); filter?.disconnect(); };
    source.start(); source.stop(this.context!.currentTime + duration);
  }
  play(sound: Sound) {
    const context = this.context;
    if (this.muted || !context || context.state !== 'running' || !this.master) return;
    const duration = sound === 'eat' ? .24 : sound === 'death' ? .45 : .045;
    const oscillator = context.createOscillator();
    oscillator.type = sound === 'death' ? 'sawtooth' : 'sine';
    oscillator.frequency.setValueAtTime(sound === 'eat' ? 400 : sound === 'death' ? 200 : 620, context.currentTime);
    if (sound !== 'turn') oscillator.frequency.exponentialRampToValueAtTime(sound === 'eat' ? 800 : 50, context.currentTime + duration);
    const gain = this.envelope(context, sound === 'turn' ? .035 : .16, duration);
    oscillator.connect(gain); this.track(oscillator, gain, duration);
    if (sound === 'death') {
      const source = context.createBufferSource();
      const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
      const samples = buffer.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
      source.buffer = buffer;
      const filter = context.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 600;
      const noiseGain = this.envelope(context, .07, duration);
      source.connect(filter); filter.connect(noiseGain); this.track(source, noiseGain, duration, filter);
    }
  }
  stop() {
    for (const source of this.voices) { try { source.stop(); } catch { /* Already ended. */ } }
    this.voices.clear();
  }
  dispose() { this.stop(); void this.context?.close().catch(() => {}); }
}
