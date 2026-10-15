import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  test as base,
  chromium,
  type BrowserContext,
  type Page,
  type Worker,
} from '@playwright/test';
import { LEDGER_KEY, SETTINGS_KEY, type Ledger, type Settings } from '@fakebits/core';

// Only the bits of the extension API used inside serviceWorker.evaluate() below.
declare const chrome: {
  storage: {
    local: {
      get(key: string): Promise<Record<string, unknown>>;
      set(items: Record<string, unknown>): Promise<void>;
    };
  };
};

const here = dirname(fileURLToPath(import.meta.url));
const extensionPath = join(here, '..', '.output', 'chrome-mv3');
const channelPage = readFileSync(join(here, 'fixtures', 'twitch-channel.html'), 'utf8');
// Nicer stand-in used only for store screenshots (store-assets.spec.ts), at /demostreamer.
const demoPage = readFileSync(join(here, '..', 'store', 'demo-channel.html'), 'utf8');
const avatar =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill="#f97316"/></svg>';

interface Fixtures {
  context: BrowserContext;
  serviceWorker: Worker;
  extensionId: string;
  /**
   * Requests that left the browser for anything but the stubbed twitch.tv pages. They are
   * aborted; tests assert the list stays empty (hard rules 1, 2 and 4).
   */
  outboundRequests: string[];
  /** Opens a stubbed twitch.tv page; the extension's content script runs on it as on the real site. */
  openTwitch: (path: string) => Promise<Page>;
  openPopup: () => Promise<Page>;
  readLedger: () => Promise<Ledger | undefined>;
  seedBits: (bits: number) => Promise<void>;
  seedLedger: (ledger: Ledger) => Promise<void>;
  seedSettings: (settings: Settings) => Promise<void>;
}

export const test = base.extend<Fixtures>({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      // The bundled Chromium still honours --load-extension, and its new headless mode runs extensions.
      channel: 'chromium',
      args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
    });
    await use(context);
    await context.close();
  },

  outboundRequests: async ({ context }, use) => {
    const outbound: string[] = [];
    await context.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      // The extension's own files (popup scripts, the content script's stylesheet).
      if (url.protocol === 'chrome-extension:') return route.continue();
      if (url.origin !== 'https://www.twitch.tv') {
        outbound.push(url.href);
        return route.abort();
      }
      if (url.pathname.endsWith('-avatar.svg')) {
        return route.fulfill({ contentType: 'image/svg+xml', body: avatar });
      }
      if (route.request().resourceType() === 'document') {
        const body = url.pathname === '/demostreamer' ? demoPage : channelPage;
        return route.fulfill({ contentType: 'text/html', body });
      }
      outbound.push(url.href);
      return route.abort();
    });
    await use(outbound);
  },

  serviceWorker: async ({ context }, use) => {
    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
    await use(worker);
  },

  extensionId: async ({ serviceWorker }, use) => {
    await use(new URL(serviceWorker.url()).host);
  },

  openTwitch: async ({ context, outboundRequests: _routes }, use) => {
    await use(async (path) => {
      const page = await context.newPage();
      await page.goto(`https://www.twitch.tv${path}`);
      return page;
    });
  },

  openPopup: async ({ context, extensionId }, use) => {
    await use(async () => {
      const page = await context.newPage();
      await page.goto(`chrome-extension://${extensionId}/popup.html`);
      return page;
    });
  },

  readLedger: async ({ serviceWorker }, use) => {
    await use(() =>
      serviceWorker.evaluate(
        async (key) => (await chrome.storage.local.get(key))[key] as Ledger | undefined,
        LEDGER_KEY,
      ),
    );
  },

  seedLedger: async ({ serviceWorker }, use) => {
    await use(async (ledger) => {
      await serviceWorker.evaluate(([key, value]) => chrome.storage.local.set({ [key]: value }), [
        LEDGER_KEY,
        ledger,
      ] as const);
    });
  },

  seedSettings: async ({ serviceWorker }, use) => {
    await use(async (settings) => {
      await serviceWorker.evaluate(([key, value]) => chrome.storage.local.set({ [key]: value }), [
        SETTINGS_KEY,
        settings,
      ] as const);
    });
  },

  seedBits: async ({ seedLedger }, use) => {
    await use(async (bits) => {
      await seedLedger({
        version: 1,
        balanceBits: bits,
        entries: [
          {
            id: 'seed',
            at: new Date().toISOString(),
            kind: 'purchase',
            tierId: 'seed',
            bits,
            usdCents: Math.round(bits * 1.4),
          },
        ],
      });
    });
  },
});

export { expect } from '@playwright/test';
