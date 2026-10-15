import { emptyLedger, isLedger, LEDGER_VERSION } from '../src';

describe('ledger', () => {
  it('creates an empty ledger at the current version', () => {
    expect(emptyLedger()).toEqual({ version: LEDGER_VERSION, balanceBits: 0, entries: [] });
  });

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['a string', 'nope'],
    ['wrong version', { version: 0, balanceBits: 0, entries: [] }],
    ['missing balance', { version: LEDGER_VERSION, entries: [] }],
    ['entries not an array', { version: LEDGER_VERSION, balanceBits: 0, entries: {} }],
  ])('rejects %s', (_label, value) => {
    expect(isLedger(value)).toBe(false);
  });

  it('accepts a valid ledger', () => {
    expect(isLedger(emptyLedger())).toBe(true);
  });
});
