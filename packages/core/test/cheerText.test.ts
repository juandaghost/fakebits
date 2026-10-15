import { MAX_CHEER_BITS, cheerAmountFromMessage } from '../src';

describe('cheerAmountFromMessage', () => {
  it.each([
    ['cheer15', 15],
    ['Cheer100', 100],
    ['CHEER500 nice run', 500],
    ['gg cHeEr1000', 1000],
    ['hype\tcheer7\nlet’s go', 7],
    ['cheer007', 7],
    [`cheer${MAX_CHEER_BITS}`, MAX_CHEER_BITS],
  ])('%j -> %i', (message, bits) => {
    expect(cheerAmountFromMessage(message)).toBe(bits);
  });

  it('adds up several tokens, as Twitch does', () => {
    expect(cheerAmountFromMessage('cheer100 great cheer50')).toBe(150);
  });

  it('caps the amount at the maximum', () => {
    expect(cheerAmountFromMessage('cheer150000')).toBe(MAX_CHEER_BITS);
    expect(cheerAmountFromMessage('cheer60000 cheer60000')).toBe(MAX_CHEER_BITS);
    expect(cheerAmountFromMessage(`cheer${'9'.repeat(30)}`)).toBe(MAX_CHEER_BITS);
  });

  it.each([
    '',
    'no cheer here',
    'cheer',
    'cheer0',
    'cheer-5',
    'cheer1.5',
    'cheer100!',
    'mycheer100',
    'cheer100bits',
    'cheers100',
  ])('ignores %j', (message) => {
    expect(cheerAmountFromMessage(message)).toBeUndefined();
  });

  it('skips zero tokens next to real ones', () => {
    expect(cheerAmountFromMessage('cheer0 cheer5')).toBe(5);
  });
});
