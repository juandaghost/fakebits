import {
  InsufficientBitsError,
  LEDGER_KEY,
  MAX_CHEER_BITS,
  MAX_MESSAGE_LENGTH,
  MemoryStorage,
  normalizeChannel,
  ValidationError,
  Wallet,
  type Ledger,
} from '../src';

function fixedClock() {
  let tick = 0;
  return () => new Date(Date.UTC(2026, 9, 14, 12, 0, tick++));
}

function sequentialIds() {
  let n = 0;
  return () => `id-${++n}`;
}

async function openWallet(storage = new MemoryStorage()) {
  return Wallet.open({ storage, now: fixedClock(), newId: sequentialIds() });
}

describe('normalizeChannel', () => {
  it('trims, lowercases and strips a leading @', () => {
    expect(normalizeChannel('  @SomeStreamer ')).toBe('somestreamer');
  });

  it.each(['', '   ', 'has space', 'too_long_for_twitch_login_name', 'ñandú', '@'])(
    'rejects %j',
    (raw) => {
      expect(() => normalizeChannel(raw)).toThrow(ValidationError);
    },
  );
});

describe('Wallet.open', () => {
  it('starts empty when nothing is stored', async () => {
    const wallet = await openWallet();
    expect(wallet.balanceBits).toBe(0);
    expect(wallet.entries).toEqual([]);
  });

  it('starts empty when stored data is unrecognisable', async () => {
    const storage = new MemoryStorage();
    await storage.set(LEDGER_KEY, { totally: 'wrong' });
    const wallet = await openWallet(storage);
    expect(wallet.balanceBits).toBe(0);
  });

  it('restores a stored ledger', async () => {
    const storage = new MemoryStorage();
    const first = await openWallet(storage);
    await first.buy('bits-500');

    const second = await openWallet(storage);
    expect(second.balanceBits).toBe(500);
    expect(second.entries).toHaveLength(1);
  });

  it('uses a real clock and uuid when none are injected', async () => {
    const wallet = await Wallet.open({ storage: new MemoryStorage() });
    const entry = await wallet.resist();
    expect(entry.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(Math.abs(Date.parse(entry.at) - Date.now())).toBeLessThan(5_000);
  });
});

describe('Wallet.buy', () => {
  it('adds bits, records the USD and persists', async () => {
    const storage = new MemoryStorage();
    const wallet = await openWallet(storage);

    const entry = await wallet.buy('bits-1500');

    expect(entry).toEqual({
      id: 'id-1',
      at: '2026-10-14T12:00:00.000Z',
      kind: 'purchase',
      tierId: 'bits-1500',
      bits: 1500,
      usdCents: 1995,
    });
    expect(wallet.balanceBits).toBe(1500);
    expect((await storage.get<Ledger>(LEDGER_KEY))?.balanceBits).toBe(1500);
  });

  it('rejects an unknown tier without touching the balance', async () => {
    const wallet = await openWallet();
    await expect(wallet.buy('bits-42')).rejects.toThrow(ValidationError);
    expect(wallet.balanceBits).toBe(0);
    expect(wallet.entries).toEqual([]);
  });
});

describe('Wallet.cheer', () => {
  it('deducts bits and records channel and trimmed message', async () => {
    const wallet = await openWallet();
    await wallet.buy('bits-500');

    const entry = await wallet.cheer({ bits: 100, channel: '@Streamer', message: '  PogChamp  ' });

    expect(entry).toEqual({
      id: 'id-2',
      at: '2026-10-14T12:00:01.000Z',
      kind: 'cheer',
      bits: 100,
      channel: 'streamer',
      message: 'PogChamp',
    });
    expect(wallet.balanceBits).toBe(400);
  });

  it('omits the message key when the message is empty or missing', async () => {
    const wallet = await openWallet();
    await wallet.buy('bits-500');

    const blank = await wallet.cheer({ bits: 1, channel: 'a', message: '   ' });
    const none = await wallet.cheer({ bits: 1, channel: 'a' });

    expect('message' in blank).toBe(false);
    expect('message' in none).toBe(false);
  });

  it.each([0, -5, 1.5, Number.NaN, MAX_CHEER_BITS + 1])('rejects %s bits', async (bits) => {
    const wallet = await openWallet();
    await wallet.buy('bits-25000');
    await expect(wallet.cheer({ bits, channel: 'a' })).rejects.toThrow(ValidationError);
  });

  it('rejects a bad channel', async () => {
    const wallet = await openWallet();
    await wallet.buy('bits-100');
    await expect(wallet.cheer({ bits: 1, channel: 'not valid!' })).rejects.toThrow(ValidationError);
  });

  it('rejects an over-long message', async () => {
    const wallet = await openWallet();
    await wallet.buy('bits-100');
    const message = 'x'.repeat(MAX_MESSAGE_LENGTH + 1);
    await expect(wallet.cheer({ bits: 1, channel: 'a', message })).rejects.toThrow(ValidationError);
  });

  it('refuses to overdraw and reports the shortfall', async () => {
    const wallet = await openWallet();
    await wallet.buy('bits-100');

    const attempt = wallet.cheer({ bits: 150, channel: 'a' });

    await expect(attempt).rejects.toBeInstanceOf(InsufficientBitsError);
    await expect(attempt).rejects.toMatchObject({ needed: 150, available: 100 });
    expect(wallet.balanceBits).toBe(100);
  });
});

describe('Wallet.resist', () => {
  it('records an entry with a normalized channel', async () => {
    const wallet = await openWallet();
    const entry = await wallet.resist('@Someone');
    expect(entry).toEqual({
      id: 'id-1',
      at: '2026-10-14T12:00:00.000Z',
      kind: 'resisted',
      channel: 'someone',
    });
  });

  it('records an entry without a channel', async () => {
    const wallet = await openWallet();
    const entry = await wallet.resist();
    expect('channel' in entry).toBe(false);
  });

  it('validates the channel when given', async () => {
    const wallet = await openWallet();
    await expect(wallet.resist('bad name')).rejects.toThrow(ValidationError);
  });
});

describe('Wallet.summary', () => {
  it('is all zeros for an empty wallet', async () => {
    const wallet = await openWallet();
    expect(wallet.summary()).toEqual({
      balanceBits: 0,
      moneySavedUsdCents: 0,
      bitsSent: 0,
      purchases: 0,
      cheers: 0,
      resisted: 0,
      cravingsBeaten: 0,
      topChannels: [],
    });
  });

  it('aggregates purchases, cheers and resists, ranking channels by bits', async () => {
    const wallet = await openWallet();
    await wallet.buy('bits-100');
    await wallet.buy('bits-500');
    await wallet.cheer({ bits: 50, channel: 'small' });
    await wallet.cheer({ bits: 200, channel: 'big' });
    await wallet.cheer({ bits: 100, channel: 'big' });
    await wallet.resist('small');
    await wallet.resist();

    expect(wallet.summary()).toEqual({
      balanceBits: 250,
      moneySavedUsdCents: 840,
      bitsSent: 350,
      purchases: 2,
      cheers: 3,
      resisted: 2,
      cravingsBeaten: 5,
      topChannels: [
        { channel: 'big', bits: 300, cheers: 2 },
        { channel: 'small', bits: 50, cheers: 1 },
      ],
    });
  });
});

describe('Wallet.entries', () => {
  it('lists newest first', async () => {
    const wallet = await openWallet();
    await wallet.buy('bits-100');
    await wallet.resist();
    expect(wallet.entries.map((e) => e.kind)).toEqual(['resisted', 'purchase']);
  });
});

describe('Wallet.reset', () => {
  it('clears memory and storage', async () => {
    const storage = new MemoryStorage();
    const wallet = await openWallet(storage);
    await wallet.buy('bits-100');

    await wallet.reset();

    expect(wallet.balanceBits).toBe(0);
    expect(wallet.entries).toEqual([]);
    expect(await storage.get(LEDGER_KEY)).toBeUndefined();
  });
});

describe('several wallets on one storage', () => {
  it('does not overwrite entries written by another wallet', async () => {
    const storage = new MemoryStorage();
    const popup = await openWallet(storage);
    const page = await Wallet.open({ storage, now: fixedClock(), newId: () => 'page' });

    await popup.buy('bits-500');
    // `page` opened before the purchase, so its copy is stale until it mutates.
    await page.cheer({ bits: 100, channel: 'a' });

    const stored = await storage.get<Ledger>(LEDGER_KEY);
    expect(stored?.balanceBits).toBe(400);
    expect(stored?.entries.map((e) => e.kind)).toEqual(['purchase', 'cheer']);
    expect(page.balanceBits).toBe(400);
  });

  it('checks the balance against storage, not a stale copy', async () => {
    const storage = new MemoryStorage();
    const first = await openWallet(storage);
    await first.buy('bits-100');
    const second = await openWallet(storage);

    await first.cheer({ bits: 100, channel: 'a' });

    await expect(second.cheer({ bits: 100, channel: 'a' })).rejects.toBeInstanceOf(
      InsufficientBitsError,
    );
    expect(second.balanceBits).toBe(0);
  });

  it('reload picks up changes made elsewhere', async () => {
    const storage = new MemoryStorage();
    const popup = await openWallet(storage);
    const page = await openWallet(storage);

    await popup.buy('bits-100');
    expect(page.balanceBits).toBe(0);

    await page.reload();
    expect(page.balanceBits).toBe(100);
    expect(page.entries).toHaveLength(1);
  });
});

describe('concurrent calls on one wallet', () => {
  it('applies them one after another', async () => {
    const storage = new MemoryStorage();
    const wallet = await openWallet(storage);

    await Promise.all([wallet.buy('bits-100'), wallet.buy('bits-500'), wallet.resist()]);

    expect(wallet.balanceBits).toBe(600);
    expect((await storage.get<Ledger>(LEDGER_KEY))?.entries).toHaveLength(3);
  });

  it('keeps going after a call fails', async () => {
    const wallet = await openWallet();

    const failed = wallet.cheer({ bits: 1, channel: 'a' });
    const bought = wallet.buy('bits-100');

    await expect(failed).rejects.toBeInstanceOf(InsufficientBitsError);
    await expect(bought).resolves.toMatchObject({ bits: 100 });
    expect(wallet.balanceBits).toBe(100);
  });
});
