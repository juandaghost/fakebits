# Store listing

Everything to paste into the Chrome Web Store and addons.mozilla.org forms. Repo:
https://github.com/juandaghost/fakebits. Chrome Web Store goes first; AMO is on hold until
there is a Firefox Add-ons account.

Images are generated, not hand-made: `node store/render-icons.mjs` for icons, and
`STORE_ASSETS=1 pnpm --filter @fakebits/extension e2e store-assets` for screenshots and the promo
tile. Output in `store/assets/`.

| Asset                        | File                                          |
| ---------------------------- | --------------------------------------------- |
| Store icon 128×128           | `store/assets/store-icon-128.png`             |
| Screenshots 1280×800 (5, en) | `store/assets/en/1-…5-*.png`                  |
| Screenshots 1280×800 (5, es) | `store/assets/es/1-…5-*.png`                  |
| Small promo tile 440×280     | `store/assets/<lang>/promo-small-440x280.png` |
| Chrome package               | `.output/fakebits-1.0.0-chrome.zip`           |
| Firefox package              | `.output/fakebits-1.0.0-firefox.zip`          |
| Firefox source (for AMO)     | `.output/fakebits-1.0.0-sources.zip`          |

Build the packages with `pnpm --filter @fakebits/extension exec wxt zip` and
`pnpm --filter @fakebits/extension exec wxt zip -b firefox`.

## Shared text

### Name

FakeBits

### Summary

Comes from the manifest (`public/_locales/*/messages.json`), so Chrome shows the right one per
language. AMO: paste it in the Summary field.

- en: Fake Twitch bits wallet to kill the urge to donate. Simulation only. Not affiliated with Twitch. No real money.
- es: Monedero falso de bits de Twitch para quitarte las ganas de donar. Es una simulación. No afiliado a Twitch. Sin dinero real.

### Description (en)

```
Want to cheer bits on a stream but don't want to spend the money? FakeBits gives you the whole ritual without the bill.

FakeBits is a SIMULATION. It is not affiliated with Twitch, it never sends anything to a channel, and it never charges money.

How it works
• Buy fake bits through a checkout that accepts anything and charges nothing.
• On a twitch.tv channel, a "Cheer (fake)" button appears under the chat box. Pick an amount, write a message, hit cheer.
• Type it the Twitch way if you like: "Cheer500 great run" sets the amount to 500.
• Your cheer shows up as a line in your own chat, marked "local only". Nobody else sees it. Nothing is posted.
• The money you "spent" is real money that stayed in your account. FakeBits keeps the total.

Beat the craving
• "I wanted to cheer but didn't" logs a craving in one tap.
• A daily streak counts the days in a row you beat the urge.
• History of every fake purchase, cheer and resisted craving, filterable by channel.

Small touches
• Cheer colours and sizes by amount, a sound and confetti on send (sound can be turned off).
• Choose the name shown on your local chat lines.

Privacy
Everything stays in your browser. No account, no servers, no analytics, no network requests. FakeBits only runs on twitch.tv and never touches Twitch's real chat box.

If you do want to support a streamer for real, please do it on Twitch itself. FakeBits is for the other times.
```

### Description (es)

```
¿Te dan ganas de mandar bits en un directo pero no quieres gastar el dinero? FakeBits te da todo el ritual sin la factura.

FakeBits es una SIMULACIÓN. No está afiliado a Twitch, nunca envía nada a un canal y nunca cobra dinero.

Cómo funciona
• Compra bits falsos con un pago que acepta cualquier cosa y no cobra nada.
• En un canal de twitch.tv aparece un botón "Cheer (fake)" bajo la caja del chat. Elige la cantidad, escribe un mensaje y envía.
• También puedes escribirlo como en Twitch: "Cheer500 qué partida" pone la cantidad en 500.
• Tu cheer aparece como una línea en tu propio chat, marcada "local only". Nadie más lo ve. No se publica nada.
• Lo que "gastaste" es dinero real que se quedó en tu cuenta. FakeBits lleva la cuenta.

Vence el antojo
• "I wanted to cheer but didn't" registra un antojo con un toque.
• Una racha diaria cuenta los días seguidos que venciste las ganas.
• Historial de cada compra falsa, cheer y antojo resistido, con filtro por canal.

Detalles
• Colores y tamaños de cheer según la cantidad, sonido y confeti al enviar (el sonido se puede apagar).
• Elige el nombre que aparece en tus líneas de chat locales.

Privacidad
Todo se queda en tu navegador. Sin cuenta, sin servidores, sin analítica, sin peticiones de red. FakeBits solo funciona en twitch.tv y nunca toca la caja de chat real de Twitch.

La interfaz de la extensión está en inglés.

Si quieres apoyar a un streamer de verdad, hazlo en Twitch. FakeBits es para el resto de las veces.
```

## Chrome Web Store

Developer dashboard: https://chrome.google.com/webstore/devconsole

### Store listing tab

- Category: Lifestyle > Well-being (alternative: Lifestyle > Just for fun)
- Language: English, then add Spanish and paste the Spanish description
- Screenshots: the five 1280×800 PNGs for each language
- Small promo tile: `promo-small-440x280.png` for each language
- Official URL: none. Homepage URL: `https://github.com/juandaghost/fakebits`
- Support URL: `https://github.com/juandaghost/fakebits/issues`
- Mature content: No

### Privacy practices tab

- Single purpose:

  ```
  Simulate buying and cheering Twitch Bits, entirely locally, so users can satisfy the urge to donate without spending real money.
  ```

- Permission justification, `storage`:

  ```
  Stores the user's fake wallet (fake purchases, fake cheers, "I resisted" entries) and settings (display name, sound on/off) on the device with storage.local. Nothing is synced or sent anywhere.
  ```

- Permission justification, host permission `https://www.twitch.tv/*`:

  ```
  Adds a "Cheer (fake)" button under the chat box on twitch.tv channel pages and renders the user's fake cheer as a line in their own chat view. It reads the channel name, display name and avatar from the page for that window. It never writes to Twitch's chat input, never posts, and never calls Twitch's APIs. No other site is accessed.
  ```

- Remote code: No, I am not using remote code.
- Data usage: tick none of the data types. Tick the three certifications (no selling, no
  unrelated use, no creditworthiness use).
- Privacy policy URL: `https://github.com/juandaghost/fakebits/blob/main/PRIVACY.md`

### Distribution tab

- Free, public, all regions.

### Notes for the reviewer (Test instructions tab)

```
No account or login is needed. FakeBits is a simulation: the checkout is fake and accepts anything (e.g. card 4242 4242 4242 4242, any expiry, any CVC, any name). No payment is made and no data leaves the browser.

To test:
1. Click the toolbar icon, "Buy bits", pick a bundle, fill the form with anything, "Pay".
2. Open any LIVE channel on https://www.twitch.tv (offline channel pages do not show the chat). A "Cheer (fake)" button appears under the chat box.
3. Click it, choose an amount, "Cheer". A line marked "LOCAL ONLY" appears in your own chat. It is not posted to Twitch.
```

## Firefox Add-ons (AMO)

Developer hub: https://addons.mozilla.org/developers/

- Upload `fakebits-1.0.0-firefox.zip`. When asked about source code: Yes, upload
  `fakebits-1.0.0-sources.zip` (the extension is bundled with Vite).
- Add-on URL slug: `fakebits`
- Summary: the shared summary above (en; add the es one under the Spanish locale)
- Description: the descriptions above
- Categories: Games & Entertainment; Social & Communication
- Tags: twitch, streaming, savings, self-control
- Support website: `https://github.com/juandaghost/fakebits/issues`
- Homepage: `https://github.com/juandaghost/fakebits`
- License: MIT
- Privacy policy: paste the English part of `PRIVACY.md`
- Screenshots: same images as Chrome
- Data collection: already declared in the manifest as none
  (`data_collection_permissions: { required: ["none"] }`)

### Notes to reviewer

```
Build instructions: SOURCE_CODE_REVIEW.md at the root of the source archive (pnpm install --frozen-lockfile, then pnpm --filter @fakebits/extension build:firefox). The rebuilt output is byte-identical to the submitted package.

FakeBits is a simulation of buying and cheering Twitch Bits. The checkout is fake and accepts anything; no payment is made. The extension makes no network requests and never writes to Twitch's chat input; the cheer it "sends" is a DOM node rendered only in the user's own tab.

The two innerHTML warnings from the linter come from Preact's runtime (dangerouslySetInnerHTML support). FakeBits never uses it; user text is inserted with textContent.

To test: buy fake bits from the toolbar popup, open a live channel on https://www.twitch.tv, click "Cheer (fake)" under the chat box.
```
