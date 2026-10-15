import { cheermoteTier } from '../src';

describe('cheermoteTier', () => {
  it.each([
    [0, 'gray'],
    [1, 'gray'],
    [99, 'gray'],
    [100, 'purple'],
    [999, 'purple'],
    [1000, 'green'],
    [4999, 'green'],
    [5000, 'blue'],
    [9999, 'blue'],
    [10000, 'red'],
    [100000, 'red'],
  ])('%i bits -> %s', (bits, name) => {
    expect(cheermoteTier(bits).name).toBe(name);
  });
});
