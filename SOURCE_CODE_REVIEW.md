# Building FakeBits from source

Instructions for add-on reviewers. The submitted Firefox package is built from this source
with no extra steps and no network access at runtime.

## Requirements

- Node.js 22 or newer
- pnpm 12 (`npm install -g pnpm --allow-scripts=pnpm`; the exact version is pinned in the
  root `package.json` under `packageManager`)
- Any OS. Built and tested on Windows 11 and Ubuntu.

## Build

From the root of this archive:

```sh
pnpm install --frozen-lockfile
pnpm --filter @fakebits/extension build:firefox
```

The output is `apps/extension/.output/firefox-mv2/`, identical to the submitted package.

## Layout

- `packages/core/`: wallet logic in plain TypeScript. No DOM, no browser APIs, no network.
- `apps/extension/`: the extension, built with [WXT](https://wxt.dev) (Vite), Preact and
  Tailwind CSS. The minified output comes from Vite/Rolldown; nothing is obfuscated.
- `apps/extension/src/twitch/twitchDom.ts`: the only place that reads twitch.tv's page.

## What the extension does

It simulates buying and cheering Twitch Bits so people can satisfy the urge without spending
money. Everything is stored in `storage.local`. It never sends requests, never writes to
Twitch's chat input, and the cheer it "sends" is a line rendered only in the user's own tab.
The `innerHTML` assignment flagged by the linter is Preact's `dangerouslySetInnerHTML`
support; FakeBits never uses it.
