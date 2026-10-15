import { useCallback, useEffect, useState } from 'preact/hooks';
import { browser } from 'wxt/browser';
import {
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  loadSettings,
  saveSettings,
  type Settings,
} from '@fakebits/core';
import { ExtensionStorage } from '@/src/storage';

const storage = new ExtensionStorage();

export interface SettingsView {
  ready: boolean;
  settings: Settings;
  save(patch: Partial<Settings>): Promise<Settings>;
}

/** Current settings, kept in sync with changes made in the popup or any Twitch tab. */
export function useSettings(): SettingsView {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      loadSettings(storage).then((loaded) => {
        if (!cancelled) setSettings(loaded);
      });
    void load();

    const onChanged = (changes: Record<string, unknown>, area: string) => {
      if (area === 'local' && SETTINGS_KEY in changes) void load();
    };
    browser.storage.onChanged.addListener(onChanged);
    return () => {
      cancelled = true;
      browser.storage.onChanged.removeListener(onChanged);
    };
  }, []);

  const save = useCallback(async (patch: Partial<Settings>) => {
    const saved = await saveSettings(storage, patch);
    setSettings(saved);
    return saved;
  }, []);

  return { ready: settings !== null, settings: settings ?? { ...DEFAULT_SETTINGS }, save };
}
