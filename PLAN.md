# FakeBits — plan

A "FakeEats for Twitch". You open it when you feel the urge to cheer or donate to a streamer,
you "buy" bits, you "send" them, you get the full dopamine hit (cheermote animation, chat line,
receipt), and no real money moves. Nothing is ever sent to Twitch.

## 1. Form factor decision

**Build a browser extension first, with a standalone PWA as a second target that shares the same core.**

Why an extension and not an app or a plain website:

- The craving happens _while you are watching the stream_. The real Cheer button is right there.
  An extension can put a look-alike button next to it and show your fake cheer inside the real chat
  column. That is the closest analog to FakeEats's "go through the whole checkout" trick.
- A website cannot touch the twitch.tv page. A native app cannot either and is overkill.
- An extension popup doubles as the "wallet" screen (balance, buy bits, history, money saved).
- Chrome Manifest V3 extensions run unchanged on Edge, Brave, Opera. Firefox needs minor manifest
  differences, which the WXT framework handles.

The PWA (phase 6) covers mobile and anyone who refuses to install an extension. It reuses the same
wallet and cheer logic, just without page injection: you type the streamer name instead.

## 2. Hard rules

1. **Never call a Twitch write endpoint and never submit anything into the real chat input.**
   Everything is rendered locally in the DOM of the user's own tab. Nobody else sees it.
2. **No real payments.** The "buy bits" checkout is a form that accepts anything. No payment
   libraries, no card validation, no network calls.
3. **No Twitch trademarks in the name, icon, or store listing.** Call it FakeBits (or similar).
   Say "simulation / parody, not affiliated with Twitch" in the listing and in the popup footer.
   Store reviewers reject anything that looks like a fake purchase flow for a real product, so
   the labelling is what gets it published.
4. **Default to no network access at all.** Streamer name and avatar come from the page DOM.
   Twitch Helix API (read-only, for the PWA to look up a channel) is an optional later addition.

## 3. Feature set

### Core (MVP)

- **Wallet**: bits balance, stored locally. Starts at 0.
- **Buy bits**: a checkout that mirrors Twitch's tiers (verify the live prices at build time;
  the tiers are roughly 100 / 500 / 1500 / 5000 / 10000 / 25000 bits). Fake card form, fake
  "processing" spinner, fake receipt. Balance goes up. "Money not spent" counter goes up.
- **Cheer**: pick amount (presets 1, 100, 500, 1000, 5000, 10000 plus custom), optional message,
  send. Balance goes down. Cheermote animation plays. Receipt is added to history.
- **History**: ledger of fake purchases and fake cheers, per streamer, with timestamps.
- **Savings dashboard**: total fake money spent, equal to real money saved. This is the number
  that makes the app actually work as a craving tool. Show it big on the popup home screen.

### On-page (extension content script)

- Inject a **"Cheer (fake)"** button next to Twitch's chat input on any `twitch.tv/<channel>` page.
- Clicking opens the cheer modal inside the page.
- On send, append a **locally rendered chat line** in the user's own chat column:
  `"<you> cheered <N> bits"` with the right cheermote tier color and the message.
  It is a DOM node the extension created. It is never posted.
- Read channel name and avatar from the page so the modal looks like it belongs.

### Nice-to-have (after MVP)

- Cheermote tiers by colour and size: 1 gray, 100 purple, 1000 green, 5000 blue, 10000 red.
- Sound effect and confetti on send.
- "Craving log": one tap to record "I wanted to cheer but didn't". Streak counter.
- Monthly "you would have spent $X" summary.
- Export / import wallet as JSON.
- Optional: real Twitch read-only lookup in the PWA for channel avatar (Helix `GET /users`).

## 4. Tech stack

| Concern             | Choice                                                                                         | Why                                                                                      |
| ------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Extension framework | WXT (wxt.dev)                                                                                  | MV3 scaffold, HMR, builds Chrome + Firefox from one source                               |
| Language            | TypeScript                                                                                     | Shared core must be type-safe; cheap in a new repo                                       |
| UI                  | Preact + Tailwind                                                                              | Tiny bundle for popup and injected modal; Preact avoids React's size in a content script |
| State / storage     | `chrome.storage.local` behind a small repository interface; `localStorage` adapter for the PWA | Same core, two adapters                                                                  |
| Tests               | Vitest for core; Playwright with a loaded extension for the injection flow                     | Core is pure logic and should be 100% covered                                            |
| Lint / format       | ESLint + Prettier                                                                              | Standard                                                                                 |
| Package manager     | pnpm                                                                                           | Workspace support for extension + web                                                    |

## 5. Repository layout

```
fakebits/
  package.json            pnpm workspace root
  packages/
    core/                 pure TS, no DOM, no browser APIs
      src/
        wallet.ts         balance, buy, cheer, ledger
        pricing.ts        bit tiers and USD values
        cheermotes.ts     tier -> colour / asset
        storage.ts        StorageAdapter interface
        index.ts
      test/
    ui/                   shared Preact components (WalletHome, BuyBits, CheerModal, Receipt, History)
  apps/
    extension/            WXT project
      entrypoints/
        popup/            wallet UI
        content.ts        twitch.tv injection
        background.ts     (likely empty for MVP)
      public/icons
      wxt.config.ts
    web/                  Vite + Preact PWA, same ui + core
  PLAN.md
```

## 6. Data model

```ts
type Ledger = {
  balanceBits: number;
  entries: LedgerEntry[];
};

type LedgerEntry =
  | { kind: 'purchase'; at: string; bits: number; usd: number }
  | { kind: 'cheer'; at: string; bits: number; channel: string; message?: string }
  | { kind: 'resisted'; at: string; channel?: string }; // craving logged, nothing "sent"

// derived, never stored:
// moneySavedUsd   = sum(purchase.usd)
// bitsSent        = sum(cheer.bits)
// topChannels     = group cheer by channel
```

Stored under one key, `fakebits.ledger.v1`. Version the key from day one so migrations are trivial.

## 7. Phases

### Phase 0: scaffold (half a day)

- `pnpm init` workspace, add `packages/core`, `apps/extension` via `pnpm dlx wxt@latest init`.
- Manifest: `permissions: ["storage"]`, `host_permissions: ["https://www.twitch.tv/*"]`. Nothing else.
- CI: lint + Vitest on push.
- Exit: extension loads unpacked in Chrome and shows a "hello" popup.

### Phase 1: core wallet (1 day)

- Implement `wallet.ts`: `buy(tier)`, `cheer(bits, channel, message)`, `resist(channel)`, `summary()`.
- `cheer` throws if balance is insufficient. `buy` records USD from `pricing.ts`.
- `StorageAdapter` interface with an in-memory impl for tests and a `chrome.storage` impl.
- Exit: Vitest green, 100% coverage on core.

### Phase 2: popup wallet UI (1 to 2 days)

- Home: big balance, big "money saved", recent entries.
- Buy bits: tier grid, fake card form (accepts anything, light formatting only), spinner, receipt.
- Cheer: channel field prefilled from the active tab URL if it is twitch.tv, amount presets, message, send, animation.
- History: list with filters by channel.
- Exit: full flow works from the popup alone without touching the Twitch page.

### Phase 3: on-page injection (2 days)

- Content script waits for Twitch's chat input (Twitch is a SPA; use a `MutationObserver`, and
  re-run on URL changes because channel navigation does not reload the page).
- Inject the button into a shadow root so Twitch CSS cannot break it and ours cannot leak out.
- Cheer modal rendered inside that shadow root. Reads channel from URL and display name from the page.
- On send: write to the ledger, then append a styled chat line into the chat list container.
  Mark it with a `data-fakebits` attribute and a small "local only" badge so the user is never
  confused about it being visible to others.
- Exit: Playwright test loads the extension, opens a twitch.tv channel, clicks the fake button, sees the chat line.

### Phase 4: polish (1 to 2 days)

- Cheermote tiers, sound, confetti, "resisted" button, streak.
- Settings: display name used in the fake chat line, sound on/off, reset wallet.
- Firefox build via WXT, smoke test.

### Phase 5: ship the extension (half a day plus review wait)

- Icons, screenshots, listing text that leads with "simulation, not affiliated with Twitch, no real money".
- Chrome Web Store, then Firefox AMO. Expect review questions about the fake checkout; the labelling answers them.

### Phase 6: PWA (1 to 2 days)

- `apps/web`: same `ui` and `core`, `localStorage` adapter, installable manifest and service worker.
- Channel is typed by hand. Optional Helix lookup for avatar later.
- Deploy as a static site.

## 8. Risks and how the plan handles them

- **Twitch DOM changes break the injection.** Keep every selector in one file, `twitchDom.ts`, and
  make the popup work fully on its own, so a broken injection degrades to "use the popup".
- **Store rejection for imitating a purchase flow.** Clear naming, no Twitch marks, explicit
  disclaimer in the UI itself, not only the listing.
- **Someone thinks the cheer was real.** The local chat line carries a visible "local only" badge
  and the receipt says "no money was sent" on every screen.
- **Scope creep toward a real donation tool.** Rule 1 and rule 2 are non-negotiable. If a real
  payment path is ever wanted it is a different product.

## 9. Phase 0 status: done (2026-10-14)

Scaffolded in this folder (repo root is the workspace root, no nested `fakebits/` dir).

- pnpm workspace: `packages/core`, `apps/extension`. `packages/ui` and `apps/web` come when phase 2 / 6 need them.
- WXT 0.21 with the vanilla template, converted to Preact + Tailwind 4 by hand (WXT ships no Preact template).
- Manifest: `permissions: ["storage"]`, `host_permissions: ["https://www.twitch.tv/*"]`, content script on twitch.tv.
- Core: `StorageAdapter` interface, `MemoryStorage`, `LEDGER_KEY`. Vitest with 100% coverage thresholds.
- Extension: `ExtensionStorage` adapter over `browser.storage.local`, popup shows balance and the disclaimer.
- CI: `.github/workflows/ci.yml` runs typecheck, test, build and uploads the Chrome build.
- ESLint/Prettier added in phase 1.

## 10. Phase 1 status: done (2026-10-14)

Core wallet in `packages/core`, 53 tests, 100% coverage on every metric.

- `pricing.ts`: the six bit tiers with USD in integer cents. Prices copied from Twitch US, verify before shipping.
- `cheermotes.ts`: five colour tiers (1 gray, 100 purple, 1000 green, 5000 blue, 10000 red).
- `ledger.ts`: persisted shape, `version: 1`, entries carry `id` and ISO `at`. `isLedger` guard so corrupt storage falls back to empty.
- `wallet.ts`: `Wallet.open()`, `buy(tierId)`, `cheer({bits, channel, message})`, `resist(channel?)`, `summary()`, `reset()`.
  Clock and id generator are injectable. Validation: integer bits 1..100000, channel `[a-z0-9_]{1,25}`
  after trim/lowercase/strip `@`, message trimmed and at most 500 chars. Overdraw throws `InsufficientBitsError`.
- Popup now opens the real wallet and shows balance, money not spent and cravings beaten.
- Root tooling: ESLint 9 flat config + typescript-eslint, Prettier. CI runs lint, format:check, typecheck, test, build.

Gotcha found: WXT 0.21's auto-import transform runs over workspace packages too, and `imports: false`
does not stop it. It injected `wxt/utils/storage` into core because core declares an identifier named
`storage`. Fixed in `wxt.config.ts` by restricting the transform to `apps/extension`. Extension code
imports from `wxt/...` explicitly.

## 11. Phase 2 status: done (2026-10-14)

Popup wallet UI, Preact + Tailwind, in `apps/extension/src/ui`.

- Deviation from section 5: no `packages/ui` yet. With a single consumer it would only add
  workspace plumbing (Tailwind source scanning across packages, Preact dedupe). Extract it in
  phase 6 when the PWA needs the same screens.
- Core additions, all pure and tested: `channelFromTwitchUrl` (handles popout/embed/moderator
  URLs and skips reserved paths like /directory), `estimateUsdCents` (1.4 cents per bit for the
  cheer receipt), `formatRelative` for timestamps. Core is at 85 tests, 100% coverage.
- Screens: Home (balance, money not spent, cravings beaten, quick "I resisted", recent entries),
  Buy (tier grid, fake card form that only formats digits, 1.1 s fake processing, receipt),
  Cheer (channel prefilled from the active tab, presets + custom, message with counter, live
  cheermote preview, shortfall link to Buy, resist shortcut, animated receipt), History (kind chips
  - channel select).
- Active tab lookup uses `browser.tabs.query` without a "tabs" permission. The URL is exposed
  only for twitch.tv tabs because of the host permission, which is exactly what we want.
- Every screen that looks like a transaction says in its own copy that nothing is charged or sent.
- Bundle: 62 KB total.

Not automated yet: there is no UI test. Phase 3 brings Playwright with the extension loaded, and
the popup flows get covered there.

Next: phase 3, on-page injection on twitch.tv.

Toolchain notes for Windows:

- pnpm 12 ships a native binary. Install it with `npm install -g pnpm --allow-scripts=pnpm`;
  without the flag npm 12 blocks its install script and the shim points at a file Windows cannot run.
- pnpm 12 blocks dependency build scripts. Approvals live in `pnpm-workspace.yaml` under `allowBuilds`
  (currently only `esbuild`). Use `pnpm approve-builds <pkg> -y` to add more.

## 12. Phase 3 status: done (2026-10-14)

On-page injection on twitch.tv, plus Playwright coverage for the page and the popup.

- `src/twitch/twitchDom.ts` holds every Twitch selector: chat button row, chat message list,
  channel display name, avatar. Lookups try a list of selectors and return undefined when none
  match, so a Twitch DOM change degrades to "no button" and the popup keeps working. The display
  name and avatar are only used when they match the channel login from the URL.
- `src/onpage/injector.tsx`: a `MutationObserver` on `document.body` plus WXT's
  `wxt:locationchange`, coalesced to one `sync` per animation frame. `sync` returns after a
  couple of property reads when the button is already in place for the current channel, and
  remounts it when Twitch re-renders the chat or the channel changes.
- The button and the modal each live in a WXT shadow root UI (`cssInjectionMode: 'ui'`), so
  Tailwind stays out of Twitch's document. The modal reuses the popup's amount picker, message
  field and summary (extracted to `src/ui/CheerParts.tsx`) and the whole Buy screen, so a user
  short on bits can "buy" without leaving the page. It has an "I resisted" path too.
- On send: wallet write first, then a chat line appended to Twitch's message list. The line is
  its own shadow-rooted node with `data-fakebits="cheer"` and a "local only" badge. The message
  goes in through `textContent` (an e2e test checks that HTML in a message stays text). The
  viewer name is "You" until the phase 4 setting exists.
- Hard rule 1 is asserted in the tests: Twitch's chat input stays empty, its send button is
  never clicked, and no request leaves for any host but the stubbed twitch.tv page.

Core change: several wallets now share one storage (the popup and every Twitch tab). Before this,
a stale wallet would overwrite the other's entries on its next write. Mutations now re-read
storage, apply to a copy and persist, and run one at a time per wallet. `Wallet.reload()` exists
for the UI, which listens to `storage.onChanged` and refreshes, so the popup follows a cheer made
on the page. 93 tests, 100% coverage. A race between two contexts writing in the same few
milliseconds is still possible; for a single user clicking by hand that is acceptable.

Two things that only showed up on the real site, both now covered by the stubbed page:

- WXT's `zIndex` option styles the shadow host, and WXT's own `:host { all: initial !important }`
  reset cancels it. On twitch.tv the player's extension iframes then sat above the modal and ate
  its clicks. The z-index is set on the UI container inside the shadow root instead.
- Twitch sets the root font size to 62.5%, which shrinks every rem-based Tailwind size. A small
  Vite plugin in `wxt.config.ts` rewrites rem to px in the content script's CSS only.

Manifest: WXT adds `web_accessible_resources` for `content-scripts/content.css`, matched to
`https://www.twitch.tv/*` only, because the shadow root UIs load their stylesheet from the
extension. No new permissions. The modal shows the channel avatar from Twitch's CDN; the image
is loaded by the twitch.tv page itself, not by the extension.

Tests (`pnpm e2e`, Playwright 1.64 with its bundled Chromium):

- `e2e/onpage.spec.ts`: cheer from the page shows the local line and updates the ledger; HTML in
  the message stays text; the button follows SPA navigation and disappears off channel pages;
  buying inside the modal when short; resisting from the modal.
- `e2e/popup.spec.ts`: empty state; buy through the fake checkout, cheer, overdraw blocked, home
  totals, resist, history filters by kind and channel; the open popup follows a cheer made on
  the page.
- `e2e/live.spec.ts`: opt-in (`FAKEBITS_LIVE=1`) smoke test on the first live channel in Twitch's
  side bar. Passed on 2026-10-14 against a live channel while logged out.
- CI has a separate `e2e` job; it does not run the live test.

Not verified:

- Logged in to Twitch. The live test ran logged out; the chat button row may hold more buttons
  when logged in (channel points, bits), and the layout was not checked there.
- Offline channels: Twitch shows a channel home page without the chat column, so there is no
  button until the user opens the Chat tab. Not tested on that tab or on `/popout/<channel>/chat`.
- Firefox (phase 4), Edge by hand with `pnpm dev`.
- Twitch's chat may virtualise or trim old messages; the local line is a foreign node in a
  React-managed list. The live run only checked it right after sending, not how it behaves as
  the chat keeps moving for a while.

Next: phase 4, polish (sound, confetti in chat, streak, settings with the display name for the
chat line, reset wallet, Firefox build).

## 13. Phase 4 status: done (2026-10-14)

Polish, settings and a Firefox build.

Already there from earlier phases and left as is: cheermote colours by tier, confetti on the
popup and modal receipts, and the "I resisted" button (popup home, popup cheer, on-page modal).
No separate "resisted" button was added to Twitch's chat row; one button there is enough clutter.

- Core `settings.ts`: `{ displayName, sound }` under `fakebits.settings.v1`, separate from the
  ledger so a wallet reset keeps them. Stored values are normalized field by field; the name is
  trimmed, whitespace-collapsed and capped at 25 characters, empty falls back to "You".
- Core `streak.ts`: `cravingStreak(entries, now)` counts consecutive local calendar days with at
  least one fake cheer or "I resisted". Purchases do not count. A run that ended yesterday is
  still current until midnight. Also returns the best run. Core is at 111 tests, 100% coverage.
- Popup: new Settings tab (display name, sound toggle with a test button, reset wallet with a
  two-tap confirm that disarms after 4 s and says what it will delete). Home shows the streak.
- Sound: synthesized with Web Audio in `src/ui/sound.ts`, no audio files, nothing fetched. A
  two-note "register" on purchase and a rising arpeggio on cheer, one note longer and higher
  per cheermote tier. Default on. Only plays after a click, so autoplay rules allow it.
- Chat line: uses the display name from settings (read at send time), the gem grows with the
  tier (18 px for 1 bit up to 30 px for 10,000+), the left border takes the tier colour, and the
  line arrives with a short flash in that colour. Reduced motion turns the flash off.
- Firefox: `pnpm --filter @fakebits/extension lint:firefox` builds `firefox-mv2` and runs
  Mozilla's `web-ext lint`. 0 errors. The 2 warnings are `innerHTML` in Preact's runtime (its
  `dangerouslySetInnerHTML` support); our code never uses it. Firefox stays on MV2 because in
  Firefox MV3 host permissions are opt-in after install, so the button would not show until the
  user granted twitch.tv access. Manifest adds `browser_specific_settings.gecko` with a fixed
  add-on id `{4566a81b-27ee-40b9-9122-3198e160d5b0}` (storage is keyed to it; never change it)
  and `data_collection_permissions: { required: ["none"] }`. The Chrome manifest is unchanged.
- CI runs the Firefox lint and uploads the Firefox build next to the Chrome one.

Tests: `e2e/settings.spec.ts` adds 5 cases: the display name reaches the chat line (with the red
tier border and 30 px gem), reset asks twice and keeps settings, the armed button disarms itself,
resisting starts a streak, and sound follows the setting (checked by counting oscillators, since
a test cannot listen). 13 stubbed e2e tests plus the live one, all passing; the live run on
twitch.tv passed again after these changes.

Not verified:

- Firefox at runtime. Firefox is not installed on this machine and Playwright cannot load
  extensions into Firefox. Only the build and `web-ext lint` are checked. To try it: run
  `lint:firefox`, then `about:debugging` > This Firefox > Load Temporary Add-on > pick
  `apps/extension/.output/firefox-mv2/manifest.json`.
- How the sounds actually sound. They were tuned on paper; adjust in `sound.ts` by ear.
- The streak uses the device's local time zone; travelling across zones can stretch or shorten
  a day. Acceptable for this use.

Next: phase 5, ship the extension (icons, screenshots, store listing, Chrome Web Store, AMO).

## 14. Phase 5 status: prepared, not submitted (2026-10-14)

Everything for both stores is ready. Submitting needs the user's developer accounts, so nothing
has been uploaded yet. Decisions taken with the user: own icon, public GitHub repo, listing in
English and Spanish (the UI stays English), first release 1.0.0.

- Icon: `apps/extension/store/icon.svg`, rendered to `public/icon/*` and the store icon by
  `node store/render-icons.mjs`. Green rounded square with a white gem: green is the "money not
  spent" colour, and it stays clear of Twitch's purple bits mark (hard rule 3). The old icon was
  WXT's template puzzle piece.
- Screenshots and promo tile: generated from the real extension by
  `STORE_ASSETS=1 pnpm --filter @fakebits/extension e2e store-assets`, five 1280×800 shots and a
  440×280 tile per language in `store/assets/<lang>/`. On-page shots use
  `store/demo-channel.html`, a generic stream page with no Twitch branding, and their caption
  says "Shown on a demo page".
- Listing: `apps/extension/store/LISTING.md` has every field for both forms (descriptions in en
  and es, single purpose, permission justifications, data-use answers, reviewer notes).
- Manifest: `default_locale: 'en'` with `public/_locales/{en,es}` for name and summary, so the
  Chrome store shows the Spanish summary to Spanish users.
- `PRIVACY.md` at the repo root, en + es. It is the privacy policy URL for both stores.
- `SOURCE_CODE_REVIEW.md` at the root: build steps for AMO reviewers. The sources zip now starts
  at the repo root (`zip.sourcesRoot: '../..'`) because the extension imports
  `@fakebits/core`. Rebuilding from the extracted sources zip gives a byte-identical
  `firefox-mv2` (checked file by file).
- Reproducibility fix: Tailwind's automatic source detection scanned whatever files were in the
  folder, so the CSS differed between this machine and the extracted sources. Both stylesheets
  now use `@import 'tailwindcss' source(none)` with explicit `@source` paths.
- Versions bumped to 1.0.0. `git init -b main` done; no commit yet.
- Packages: `.output/fakebits-1.0.0-chrome.zip`, `-firefox.zip`, `-sources.zip`.

Checks: core 111 tests at 100%, typecheck, lint, format, 13 stubbed e2e tests, live twitch.tv
test, Firefox `web-ext lint` (0 errors, the 2 known Preact warnings).

Waiting on the user:

- Chrome Web Store developer account (one-time 5 USD fee) and AMO account.
- GitHub username and the empty public repo, to fill `<github-user>` in `LISTING.md`.
- Repo licence (MIT recommended), then add `LICENSE`.
- Support contact (repo issues page or an email).
- Confirm the bit prices in `packages/core/src/pricing.ts` against Twitch while logged in.

Then: first commit and push, fill the URLs, upload both packages, and answer review questions.

Addendum (2026-10-14, same day, before submission): cheer syntax in the message. Typing
`cheer<amount>` as a word of its own, any case (`cheer15`, `Cheer100`, `CHEER500`), sets the
amount, in the popup and in the on-page modal. Several tokens add up, as on Twitch, and the total
is capped at 100,000. Tokens glued to other characters (`cheer100!`, `mycheer100`) do not count.
The message only overrides the amount when its tokens change, so a preset picked afterwards
sticks. Parser: `cheerAmountFromMessage` in core (`cheerText.ts`, 20 tests; core now 131 tests at
100%). New e2e cases in `onpage.spec.ts` and `popup.spec.ts`. Store screenshots, listing text and
the 1.0.0 packages were regenerated after this change.

Update (2026-10-14): the user confirmed the bit prices against Twitch, chose the MIT licence, the
repo `github.com/juandaghost/fakebits` (public) with the repo's issues page as support contact,
and commits under the GitHub noreply email (set in the repo's local git config). Only a Chrome
Web Store account exists for now; the AMO submission waits until there is a Firefox Add-ons
account. GitHub CLI was installed with winget for creating the repo and pushing.
