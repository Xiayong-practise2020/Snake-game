import { expect, it } from 'vitest';
import { segmentColor } from '../../src/render';

it('渐变在不同蛇长下保持准确的头尾颜色，单节蛇保持亮绿', () => {
  expect(segmentColor(0, 1)).toBe('#00ff88');
  for (const length of [3, 9, 900]) {
    expect(segmentColor(0, length)).toBe('#00ff88');
    expect(segmentColor(length - 1, length)).toBe('#006633');
    const channels = Array.from({ length }, (_, index) => parseInt(segmentColor(index, length).slice(3, 5), 16));
    expect(channels.every((channel, index) => index === 0 || channel <= channels[index - 1])).toBe(true);
  }
});
