import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Page } from '@playwright/test';
import { DEFAULT_SETTINGS, type Ledger } from '@fakebits/core';
import { expect, test } from './fixtures';

// Generates the store screenshots and promo tile from the real extension.
//   STORE_ASSETS=1 pnpm --filter @fakebits/extension e2e store-assets
// Output: apps/extension/store/assets/<lang>/. On-page shots use store/demo-channel.html,
// a generic page (no Twitch branding), and say so in their caption.

test.skip(!process.env.STORE_ASSETS, 'set STORE_ASSETS=1 to regenerate store images');

const here = dirname(fileURLToPath(import.meta.url));
const assets = join(here, '..', 'store', 'assets');
const iconSvg = readFileSync(join(here, '..', 'store', 'icon.svg'), 'utf8');

type Lang = 'en' | 'es';
const COPY: Record<Lang, { title: string; body: string }[]> & {
  tagline: Record<Lang, string>;
} = {
  en: [
    {
      title: 'Buy bits. Spend nothing.',
      body: 'A fake wallet for the urge to cheer. Every “purchase” is real money that stays in your account.',
    },
    {
      title: 'A checkout that charges nothing',
      body: 'Type anything. No card is validated, stored or sent anywhere.',
    },
    {
      title: 'Cheer right from the chat',
      body: 'Shown on a demo page. On twitch.tv the button sits under the chat box.',
    },
    {
      title: 'Only you can see it',
      body: 'The cheer appears in your own chat, marked “local only”. Nothing is ever posted.',
    },
    {
      title: 'Count the cravings you beat',
      body: 'Every fake cheer and every “I resisted” is logged, with a daily streak.',
    },
  ],
  es: [
    {
      title: 'Compra bits. No gastes nada.',
      body: 'Un monedero falso para las ganas de donar. Cada “compra” es dinero real que se queda en tu cuenta.',
    },
    {
      title: 'Un pago que no cobra nada',
      body: 'Escribe lo que quieras. Ninguna tarjeta se valida, se guarda ni se envía.',
    },
    {
      title: 'Haz cheer desde el chat',
      body: 'Página de demostración. En twitch.tv el botón aparece bajo la caja del chat.',
    },
    {
      title: 'Solo lo ves tú',
      body: 'El cheer aparece en tu propio chat, marcado como “local only”. Nunca se publica nada.',
    },
    {
      title: 'Cuenta los antojos que venciste',
      body: 'Cada cheer falso y cada “resistí” queda registrado, con una racha diaria.',
    },
  ],
  tagline: {
    en: 'Cheer without spending a cent',
    es: 'Haz cheer sin gastar ni un centavo',
  },
};

const STYLE = `
  * { box-sizing: border-box; }
  body {
    margin: 0; width: 1280px; height: 800px; overflow: hidden;
    font-family: Inter, 'Segoe UI', system-ui, sans-serif; color: #f4f4f5;
    background: radial-gradient(circle at 20% 20%, #064e3b, #09090b 60%);
  }
  h1 { margin: 0; font-size: 46px; line-height: 1.1; letter-spacing: -0.02em; }
  p { margin: 16px 0 0; font-size: 22px; line-height: 1.45; color: #a1a1aa; }
  .badge { display: inline-block; margin-bottom: 20px; padding: 4px 10px; border-radius: 6px;
    background: #27272a; color: #a1a1aa; font-size: 14px; letter-spacing: 0.08em; text-transform: uppercase; }
  img.shot { border-radius: 18px; box-shadow: 0 30px 80px #000a; }
`;

/** Screenshot after CSS transitions (150 ms) have finished. */
async function settled(page: Page): Promise<Buffer> {
  await page.waitForTimeout(400);
  return page.screenshot();
}

const dataUrl = (png: Buffer) => `data:image/png;base64,${png.toString('base64')}`;

/** Caption on the left, the popup at 1.25x on the right. */
const popupSlide = (shot: Buffer, { title, body }: { title: string; body: string }) => `
  <style>${STYLE}</style>
  <div style="display:flex;align-items:center;gap:80px;height:100%;padding:0 110px">
    <div style="flex:1"><span class="badge">simulation · no real money</span><h1>${title}</h1><p>${body}</p></div>
    <img class="shot" src="${dataUrl(shot)}" style="width:450px;height:700px" />
  </div>`;

/** Caption band on top, the page below. */
const pageSlide = (shot: Buffer, { title, body }: { title: string; body: string }) => `
  <style>${STYLE} h1 { font-size: 34px; } p { margin-top: 6px; font-size: 18px; }</style>
  <div style="padding:28px 60px 0;height:128px"><h1>${title}</h1><p>${body}</p></div>
  <div style="display:flex;justify-content:center">
    <img class="shot" src="${dataUrl(shot)}" style="width:1056px;height:660px;border-radius:12px" />
  </div>`;

async function compose(page: Page, html: string, path: string, width = 1280, height = 800) {
  await page.setViewportSize({ width, height });
  await page.setContent(html);
  await page.screenshot({ path });
}

const DAY = 24 * 60 * 60 * 1000;
const at = (daysAgo: number, hour: number) => {
  const d = new Date(Date.now() - daysAgo * DAY);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

// Four days of history: a 4-day streak, two purchases, two cheers, two "I resisted".
const LEDGER: Ledger = {
  version: 1,
  balanceBits: 5000,
  entries: [
    { id: '1', at: at(3, 19), kind: 'purchase', tierId: 'bits-5000', bits: 5000, usdCents: 6440 },
    {
      id: '2',
      at: at(3, 20),
      kind: 'cheer',
      bits: 1000,
      channel: 'cozycrafts',
      message: 'love this build',
    },
    { id: '3', at: at(2, 21), kind: 'resisted', channel: 'demostreamer' },
    { id: '4', at: at(1, 18), kind: 'purchase', tierId: 'bits-1500', bits: 1500, usdCents: 1995 },
    {
      id: '5',
      at: at(1, 19),
      kind: 'cheer',
      bits: 500,
      channel: 'speedqueen',
      message: 'PB hype!',
    },
    { id: '6', at: at(0, 0), kind: 'resisted' },
  ],
};

for (const lang of ['en', 'es'] as const) {
  test(`store images (${lang})`, async ({
    context,
    openPopup,
    openTwitch,
    seedLedger,
    seedSettings,
  }) => {
    test.setTimeout(60_000);
    await seedLedger(LEDGER);
    await seedSettings({ ...DEFAULT_SETTINGS, displayName: 'Alex' });
    const out = (name: string) => join(assets, lang, name);
    const canvas = await context.newPage();
    const copy = COPY[lang];

    // 1. Home
    const popup = await openPopup();
    await popup.setViewportSize({ width: 360, height: 560 });
    await expect(popup.getByTestId('streak')).toHaveText('4-day streak');
    await compose(canvas, popupSlide(await settled(popup), copy[0]!), out('1-home.png'));

    // 2. Checkout
    await popup.getByRole('button', { name: 'Buy bits' }).click();
    await popup.getByRole('button', { name: /^1,500 bits/ }).click();
    await popup.getByLabel('Card number').fill('4242424242424242');
    await popup.getByLabel('Expiry').fill('1230');
    await popup.getByLabel('CVC').fill('123');
    await popup.getByLabel('Name on card').fill('Anything goes');
    await compose(canvas, popupSlide(await settled(popup), copy[1]!), out('2-checkout.png'));

    // 5. History (before the cheer below changes it)
    await popup.getByRole('navigation').getByRole('button', { name: 'History' }).click();
    await compose(canvas, popupSlide(await settled(popup), copy[4]!), out('5-history.png'));

    // 3. Modal on the demo page
    const page = await openTwitch('/demostreamer');
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.getByRole('button', { name: 'Cheer (fake)' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: '1,000', exact: true }).click();
    await dialog.getByLabel('Message').fill('this run is unreal');
    await compose(canvas, pageSlide(await settled(page), copy[2]!), out('3-cheer-on-page.png'));

    // 4. The local chat line
    await dialog.getByRole('button', { name: 'Cheer 1,000 bits' }).click();
    await dialog.getByRole('button', { name: 'Close' }).last().click();
    await expect(page.locator('[data-fakebits="cheer"]')).toContainText('Alex');
    await page.waitForTimeout(1600); // let the arrival flash settle
    await compose(canvas, pageSlide(await settled(page), copy[3]!), out('4-local-chat-line.png'));

    // Small promo tile, 440x280
    await compose(
      canvas,
      `<style>${STYLE} body { width: 440px; height: 280px; }</style>
       <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:14px;text-align:center">
         <div style="width:96px;height:96px">${iconSvg.replace('<svg ', '<svg width="96" height="96" ')}</div>
         <div style="font-size:34px;font-weight:700;letter-spacing:-0.02em">FakeBits</div>
         <div style="font-size:17px;color:#a1a1aa">${COPY.tagline[lang]}</div>
       </div>`,
      out('promo-small-440x280.png'),
      440,
      280,
    );
  });
}
