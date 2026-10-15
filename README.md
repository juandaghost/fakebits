# FakeBits

A fake Twitch bits wallet to kill the urge to donate. You "buy" bits, you "cheer", you get the
animation and the receipt, and no real money moves. Nothing is ever sent to Twitch.

**Simulation only. Not affiliated with Twitch. No real money.**

See [PLAN.md](PLAN.md) for the full plan and the hard rules.

## Layout

- `packages/core` pure wallet logic, no DOM, 100% test coverage required
- `apps/extension` WXT browser extension (Chrome MV3, Firefox) with Preact + Tailwind
- `apps/web` planned PWA sharing the same core (phase 6)

## Develop

Requires Node 22 and pnpm 12 (`npm install -g pnpm --allow-scripts=pnpm`).

```sh
pnpm install
pnpm test          # core tests with coverage
pnpm e2e           # builds, then Playwright with the extension loaded (see below)
pnpm typecheck
pnpm build         # outputs apps/extension/.output/chrome-mv3
pnpm dev           # WXT dev mode with hot reload, opens a browser with the extension loaded
```

### `pnpm dev` says "No Chrome installations found"

WXT launches Chrome by default. If you only have Edge (or Brave, or Chrome in a non-standard
place), create `apps/extension/web-ext.config.ts` with the path to your browser. The file is
gitignored because it is machine-specific.

```ts
import { defineWebExtConfig } from 'wxt';

export default defineWebExtConfig({
  binaries: {
    chrome: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  },
});
```

## Release

Store listing text, image generation and upload steps: [apps/extension/store/LISTING.md](apps/extension/store/LISTING.md).
Privacy policy: [PRIVACY.md](PRIVACY.md). Build steps for Mozilla reviewers:
[SOURCE_CODE_REVIEW.md](SOURCE_CODE_REVIEW.md).

## End-to-end tests

Playwright loads the built extension into its own Chromium. The on-page tests run against a
stubbed twitch.tv page (`apps/extension/e2e/fixtures/twitch-channel.html`), so they are
deterministic and never reach the network.

```sh
pnpm --filter @fakebits/extension exec playwright install chromium   # once per machine
pnpm e2e
```

To check the selectors against the real site, run the opt-in live smoke test. It opens the first
live channel in Twitch's side bar (or `FAKEBITS_LIVE_CHANNEL`) and saves screenshots under
`apps/extension/test-results/`.

```sh
FAKEBITS_LIVE=1 pnpm e2e
```

## Load the extension by hand

1. `pnpm build`
2. Open `chrome://extensions`, turn on Developer mode
3. "Load unpacked" and pick `apps/extension/.output/chrome-mv3`
4. Click the FakeBits icon to buy some fake bits.
5. Open a live `twitch.tv` channel. A "Cheer (fake)" button appears in the row under the chat
   input. Content scripts only reach tabs loaded after the extension was installed or reloaded,
   so reload the tab if it was already open.

Firefox: `pnpm --filter @fakebits/extension lint:firefox` builds `.output/firefox-mv2` and runs
Mozilla's linter. Then open `about:debugging`, "This Firefox", "Load Temporary Add-on", and pick
`apps/extension/.output/firefox-mv2/manifest.json`.

## License

[MIT](LICENSE)
