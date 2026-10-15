import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig, type WxtUnimportOptions } from 'wxt';
import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';
import type { Plugin } from 'vite';

// WXT's auto-import transform runs on every bundled module, including
// workspace packages, and `imports: false` does not stop it in 0.21. It once
// injected `wxt/utils/storage` into @fakebits/core because core has an
// identifier named `storage`. Limit the transform to this app's own files.
// `include` is forwarded to unimport's Vite plugin but missing from WXT's
// type, hence the assertion. Convention in this repo: import from 'wxt/...'
// explicitly anyway.
const imports = {
  include: [/[\\/]apps[\\/]extension[\\/]/],
} as WxtUnimportOptions;

// Tailwind sizes are in rem, and rem follows the host page's root font size, which
// Twitch changes. In the content script's stylesheet only, rewrite rem to px so the
// on-page UI renders at the same size as the popup (1rem = 16px).
// Runs on the written file: Vite emits the content script's CSS after user plugins'
// generateBundle hooks, so it is not in the bundle any earlier.
const remToPxInContentCss: Plugin = {
  name: 'fakebits:rem-to-px-in-content-css',
  writeBundle(options, bundle) {
    for (const fileName of Object.keys(bundle)) {
      if (!/^content-scripts\/.*\.css$/.test(fileName) || !options.dir) continue;
      const path = join(options.dir, fileName);
      const css = readFileSync(path, 'utf8').replace(
        /(?<![\w.-])(-?\d*\.?\d+)rem\b/g,
        (_match, value: string) => `${Number(value) * 16}px`,
      );
      writeFileSync(path, css);
    }
  },
};

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: '.',
  imports,
  // AMO reviewers rebuild from source. The extension imports @fakebits/core from the
  // workspace, so the sources zip starts at the repo root. Build steps for reviewers are in
  // SOURCE_CODE_REVIEW.md at the root.
  zip: {
    name: 'fakebits',
    sourcesRoot: '../..',
    excludeSources: [
      '**/coverage/**',
      '**/test-results/**',
      '**/playwright-report/**',
      '**/.output/**',
      '**/.wxt/**',
      // Machine-specific browser path, gitignored.
      'apps/extension/web-ext.config.ts',
      // Store screenshots and promo images, not part of the build.
      'apps/extension/store/assets/**',
    ],
  },
  vite: () => ({
    plugins: [preact(), tailwindcss(), remToPxInContentCss],
  }),
  // Firefox stays on MV2 (WXT's default): in Firefox MV3, host permissions are opt-in after
  // install, so the button would not appear on twitch.tv until the user granted access.
  manifest: ({ browser }) => ({
    // Store name and summary per language live in public/_locales. The UI itself is English.
    default_locale: 'en',
    name: '__MSG_extName__',
    short_name: 'FakeBits',
    description: '__MSG_extDescription__',
    // Hard rule 4 from PLAN.md: storage only, twitch.tv only, no other access.
    permissions: ['storage'],
    host_permissions: ['https://www.twitch.tv/*'],
    ...(browser === 'firefox'
      ? {
          browser_specific_settings: {
            gecko: {
              // Fixed id: storage is keyed to it, and AMO requires one. Never change it.
              id: '{4566a81b-27ee-40b9-9122-3198e160d5b0}',
              // Nothing leaves the browser (hard rule 4), declared for AMO.
              data_collection_permissions: { required: ['none'] },
            },
          },
        }
      : {}),
  }),
});
