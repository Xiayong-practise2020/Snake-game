export type Point = { x: number; y: number };
export type Direction = 'up' | 'down' | 'left' | 'right';
export type Phase = 'ready' | 'running' | 'paused' | 'gameOver' | 'won';
export type State = { snake: Point[]; direction: Direction; food: Point | null; score: number; phase: Phase };
