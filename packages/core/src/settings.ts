import type { StorageAdapter } from './storage';

/** Storage key for user settings. Separate from the ledger so a wallet reset keeps them. */
export const SETTINGS_KEY = 'fakebits.settings.v1';

/** Same cap as a Twitch display name. */
export const MAX_DISPLAY_NAME_LENGTH = 25;

export interface Settings {
  /** Name shown on the local chat line. Free text, rendered as text only. */
  displayName: string;
  /** Play a short synthesized sound on fake purchases and cheers. */
  sound: boolean;
}

export const DEFAULT_SETTINGS: Readonly<Settings> = { displayName: 'You', sound: true };

/** Trims, collapses whitespace, caps the length. Empty falls back to the default name. */
export function cleanDisplayName(raw: string): string {
  const name = raw.replace(/\s+/g, ' ').trim().slice(0, MAX_DISPLAY_NAME_LENGTH).trim();
  return name || DEFAULT_SETTINGS.displayName;
}

/** Stored data that is missing or malformed falls back to the defaults field by field. */
export function normalizeSettings(value: unknown): Settings {
  const candidate =
    typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
  const { displayName, sound } = candidate;
  return {
    displayName:
      typeof displayName === 'string'
        ? cleanDisplayName(displayName)
        : DEFAULT_SETTINGS.displayName,
    sound: typeof sound === 'boolean' ? sound : DEFAULT_SETTINGS.sound,
  };
}

export async function loadSettings(storage: StorageAdapter): Promise<Settings> {
  return normalizeSettings(await storage.get<unknown>(SETTINGS_KEY));
}

/** Merges `patch` into the stored settings and returns what was saved. */
export async function saveSettings(
  storage: StorageAdapter,
  patch: Partial<Settings>,
): Promise<Settings> {
  const next = normalizeSettings({ ...(await loadSettings(storage)), ...patch });
  await storage.set(SETTINGS_KEY, next);
  return next;
}
