// Renders store/icon.svg into the PNG sizes the manifest and the stores use.
// Run from apps/extension: node store/render-icons.mjs
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const svg = readFileSync(new URL('./icon.svg', import.meta.url), 'utf8');
const targets = [
  ...[16, 32, 48, 96, 128].map((size) => ({ size, path: `public/icon/${size}.png` })),
  // Chrome Web Store: 128 px with the artwork in the central 96 px.
  { size: 128, inset: 16, path: 'store/assets/store-icon-128.png' },
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const { size, inset = 0, path } of targets) {
  await page.setViewportSize({ width: size, height: size });
  const inner = size - inset * 2;
  await page.setContent(
    `<body style="margin:0;background:transparent">
       <div style="padding:${inset}px;width:${inner}px;height:${inner}px">${svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</div>
     </body>`,
  );
  await page.screenshot({ path, omitBackground: true });
  console.info('wrote', path);
}
await browser.close();
