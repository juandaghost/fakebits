import { browser } from 'wxt/browser';
import type { StorageAdapter } from '@fakebits/core';

/**
 * StorageAdapter backed by the extension's local storage area.
 * `browser` is WXT's cross-browser alias for chrome.* / browser.*.
 */
export class ExtensionStorage implements StorageAdapter {
  async get<T>(key: string): Promise<T | undefined> {
    const result = await browser.storage.local.get(key);
    return result[key] as T | undefined;
  }

  async set<T>(key: string, value: T): Promise<void> {
    await browser.storage.local.set({ [key]: value });
  }

  async remove(key: string): Promise<void> {
    await browser.storage.local.remove(key);
  }
}
