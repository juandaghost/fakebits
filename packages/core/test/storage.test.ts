import { LEDGER_KEY, MemoryStorage } from '../src';

describe('MemoryStorage', () => {
  it('round-trips a value and returns a copy', async () => {
    const storage = new MemoryStorage();
    const original = { balance: 100 };

    await storage.set(LEDGER_KEY, original);
    original.balance = 999;

    expect(await storage.get<typeof original>(LEDGER_KEY)).toEqual({ balance: 100 });
  });

  it('returns undefined for a missing key', async () => {
    const storage = new MemoryStorage();
    expect(await storage.get('nope')).toBeUndefined();
  });

  it('removes a key', async () => {
    const storage = new MemoryStorage();
    await storage.set('k', 1);
    await storage.remove('k');
    expect(await storage.get('k')).toBeUndefined();
  });
});
