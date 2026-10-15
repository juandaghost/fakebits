import { browser } from 'wxt/browser';
import { channelFromTwitchUrl } from '@fakebits/core';

/**
 * Channel of the tab the popup was opened on, if it is a twitch.tv channel page.
 * No "tabs" permission needed: the URL is exposed because twitch.tv is a host permission.
 */
export async function activeTwitchChannel(): Promise<string | undefined> {
  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    return tab?.url ? channelFromTwitchUrl(tab.url) : undefined;
  } catch {
    return undefined;
  }
}
