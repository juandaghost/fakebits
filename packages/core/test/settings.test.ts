import {
  DEFAULT_SETTINGS,
  MAX_DISPLAY_NAME_LENGTH,
  MemoryStorage,
  SETTINGS_KEY,
  cleanDisplayName,
  loadSettings,
  normalizeSettings,
  saveSettings,
} from '../src';

describe('cleanDisplayName', () => {
  it('trims and collapses whitespace', () => {
    expect(cleanDisplayName('  Big \t  Fan  ')).toBe('Big Fan');
  });

  it('caps the length without leaving a trailing space', () => {
    const name = cleanDisplayName(`${'a'.repeat(MAX_DISPLAY_NAME_LENGTH - 1)} tail`);
    expect(name).toBe('a'.repeat(MAX_DISPLAY_NAME_LENGTH - 1));
  });

  it('falls back to the default when empty', () => {
    expect(cleanDisplayName('   ')).toBe(DEFAULT_SETTINGS.displayName);
  });

  it('keeps any characters; rendering is text-only', () => {
    expect(cleanDisplayName('ñandú <b>')).toBe('ñandú <b>');
  });
});

describe('normalizeSettings', () => {
  it.each([undefined, null, 'nope', 42])('uses the defaults for %j', (value) => {
    expect(normalizeSettings(value)).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps valid fields and replaces invalid ones', () => {
    expect(normalizeSettings({ displayName: ' Me ', sound: 'yes' })).toEqual({
      displayName: 'Me',
      sound: DEFAULT_SETTINGS.sound,
    });
    expect(normalizeSettings({ displayName: 7, sound: false })).toEqual({
      displayName: DEFAULT_SETTINGS.displayName,
      sound: false,
    });
  });

  it('drops unknown fields', () => {
    expect(normalizeSettings({ ...DEFAULT_SETTINGS, extra: 1 })).toEqual(DEFAULT_SETTINGS);
  });
});

describe('loadSettings / saveSettings', () => {
  it('loads defaults from empty storage', async () => {
    expect(await loadSettings(new MemoryStorage())).toEqual(DEFAULT_SETTINGS);
  });

  it('merges a patch, cleans it and persists the result', async () => {
    const storage = new MemoryStorage();
    await saveSettings(storage, { sound: false });
    const saved = await saveSettings(storage, { displayName: '  Night   Owl ' });

    expect(saved).toEqual({ displayName: 'Night Owl', sound: false });
    expect(await storage.get(SETTINGS_KEY)).toEqual(saved);
    expect(await loadSettings(storage)).toEqual(saved);
  });
});
