# CLAUDE.md — contexto para continuar FakeBits

Este archivo existe porque el proyecto se movió de máquina y de cuenta. La conversación
anterior no está disponible. Lee esto antes de tocar nada.

## Qué es esto

FakeBits: una extensión de navegador que simula comprar y enviar bits a streamers de Twitch
para matar el antojo de donar de verdad, al estilo de las apps de "pedir comida falsa".
Nunca se envía nada a Twitch ni se cobra dinero real. El plan completo, con decisiones,
fases y estado, está en `PLAN.md`. `README.md` tiene los comandos y cómo cargar la extensión.

## Cómo trabajar con el usuario

- El usuario escribe en español. Responde en español. El código, los comentarios y los
  documentos técnicos del repo están en inglés y así deben seguir.
- Va fase por fase según `PLAN.md` y suele decir "siguiente fase" o "movámonos a la fase N".
  Antes de empezar una fase, lee su sección en el plan y la sección de estado de la anterior.
- No hagas commits ni push salvo que lo pida. El `.git` original se perdió al mover de
  máquina; en la fase 5 se creó de nuevo con un único commit inicial con las fases 0 a 5.
  Remoto: `https://github.com/juandaghost/fakebits` (público). Identidad de git configurada
  solo en este repo, con el email noreply de GitHub. A partir de aquí, un commit por cambio
  o fase es razonable.
- Al terminar una fase, añade una sección de estado al final de `PLAN.md` (sigue el formato
  de las secciones 9, 10 y 11) y di qué queda sin verificar.

## Reglas duras del producto (no negociables)

1. Nunca llamar a un endpoint de escritura de Twitch ni escribir en el input real del chat.
   Todo lo que se "envía" se renderiza localmente en la pestaña del usuario.
2. Sin pagos reales. El checkout acepta cualquier cosa y no hace llamadas de red.
3. Sin marcas de Twitch en nombre, icono ni ficha de la tienda. Etiquetar como simulación
   en la propia interfaz, no solo en la tienda.
4. Sin acceso de red por defecto. Manifest: `permissions: ["storage"]` y
   `host_permissions: ["https://www.twitch.tv/*"]`. Nada más sin justificarlo en el plan.

## Estado actual

- Fases 0 a 4 hechas. Estado y pendientes de verificar en las secciones 12 (fase 3) y 13
  (fase 4) del plan. Firefox solo está verificado con build + `web-ext lint`: no hay Firefox
  instalado en esta máquina.
- Fase 5 (publicar) preparada pero sin enviar: sección 14 del plan. Precios, licencia (MIT),
  repo `juandaghost/fakebits` y soporte (issues) ya decididos; solo hay cuenta de Chrome Web
  Store, AMO queda para después. Todo lo de las tiendas está en `apps/extension/store/` (`LISTING.md`, icono, assets generados).
- Decisiones de la fase 5: icono propio verde con gema blanca, repo público en GitHub, ficha en
  inglés y español (la UI sigue en inglés), versión 1.0.0.
- El id de Firefox `{4566a81b-27ee-40b9-9122-3198e160d5b0}` en `wxt.config.ts` es fijo: el
  storage depende de él. No lo cambies.

## Estructura

```
packages/core/        lógica pura, sin DOM ni APIs de navegador. 131 tests, cobertura 100% obligatoria
  src/wallet.ts       Wallet.open / reload / buy / cheer / resist / summary / reset
                      cada mutación relee storage y van en cola: popup y pestañas comparten ledger
  src/ledger.ts       forma persistida (version 1), LEDGER_KEY = 'fakebits.ledger.v1'
  src/pricing.ts      tiers de bits en centavos, estimateUsdCents, formatUsd
  src/cheermotes.ts   niveles de color por cantidad
  src/twitchUrl.ts    channelFromTwitchUrl
  src/time.ts         formatRelative
  src/storage.ts      StorageAdapter + MemoryStorage
  src/settings.ts     ajustes (displayName, sound), SETTINGS_KEY aparte del ledger
  src/cheerText.ts    cheerAmountFromMessage: "cheer500" en el mensaje fija la cantidad
                      (sin distinguir mayúsculas, varios se suman, tope 100000)
  src/streak.ts       cravingStreak: días seguidos con un cheer falso o un "resistí"
  src/cheerText.ts    cheerAmountFromMessage: "cheer500" en el mensaje (sin mayúsculas, suma, tope 100000)
apps/extension/       WXT 0.21, Preact, Tailwind 4, Manifest V3
  entrypoints/popup/  App.tsx enruta entre pantallas
  entrypoints/content/     content script en twitch.tv (cssInjectionMode 'ui') + su style.css
  src/ui/             Home, Buy, Cheer, CheerParts, History, Settings, Nav, EntryRow, Cheermote,
                      Burst, useWallet y useSettings (escuchan storage.onChanged), sound (Web
                      Audio), styles, animations.css
  src/onpage/         injector (observer + montaje), CheerButton, CheerModal, chatLine
  src/storage.ts      ExtensionStorage sobre browser.storage.local
  src/twitch/twitchDom.ts       TODOS los selectores de Twitch, solo lectura
  src/twitch/activeChannel.ts   canal de la pestaña activa
  e2e/                Playwright: onpage, popup, settings, live (opcional) y la página falsa de Twitch
  web-ext.config.ts   ruta del navegador para `pnpm dev`, específica de cada máquina, gitignored
```

`packages/ui` y `apps/web` del plan no existen todavía. Se crean en la fase 6 (PWA).

## Comandos

```sh
pnpm install
pnpm test          # core con cobertura, umbral 100% en todo
pnpm typecheck
pnpm lint
pnpm format        # prettier --write; format:check en CI
pnpm build         # apps/extension/.output/chrome-mv3
pnpm e2e           # build + Playwright contra una página falsa de twitch.tv
FAKEBITS_LIVE=1 pnpm e2e   # además, smoke test contra twitch.tv real (capturas en test-results/)
pnpm --filter @fakebits/extension lint:firefox   # build firefox-mv2 + web-ext lint
pnpm --filter @fakebits/extension exec wxt zip [-b firefox]   # paquetes para las tiendas
node apps/extension/store/render-icons.mjs   # desde apps/extension: iconos desde store/icon.svg
STORE_ASSETS=1 pnpm --filter @fakebits/extension e2e store-assets   # capturas y promo tile
pnpm dev           # abre el navegador con la extensión cargada
```

Antes de dar una fase por terminada, test, typecheck, lint, format:check y e2e deben pasar y el
build debe salir limpio. Si se tocan selectores o UI en la página, corre también el test live.
Navegador de Playwright, una vez por máquina: `pnpm --filter @fakebits/extension exec playwright install chromium`.

## Convenciones y trampas conocidas

- En la extensión, importa de `wxt/...` explícitamente (`wxt/browser`,
  `wxt/utils/define-content-script`, etc.). El auto-import de WXT está limitado a
  `apps/extension` en `wxt.config.ts` porque en 0.21 recorre también los paquetes del workspace
  e inyectó `wxt/utils/storage` en core al ver un identificador llamado `storage`.
  `imports: false` no lo desactiva. No quites ese `include`.
- Core usa `exactOptionalPropertyTypes`: construye las propiedades opcionales condicionalmente
  (`...(message ? { message } : {})`), no las pases como `undefined`.
- Dinero siempre en centavos enteros.
- `Wallet` recibe reloj y generador de ids inyectables; los tests usan reloj fijo e ids secuenciales.
- Preact: usa `class`, no `className`. Las clases compartidas están en `src/ui/styles.ts`.
- Toda pantalla que parezca una transacción debe decir en su propio texto que no se cobra ni
  se envía nada.
- Windows: pnpm 12 trae binario nativo; instálalo con `npm install -g pnpm --allow-scripts=pnpm`.
  pnpm bloquea scripts de build de dependencias; las aprobaciones están en
  `pnpm-workspace.yaml` bajo `allowBuilds` (solo `esbuild`). Para añadir otra:
  `pnpm approve-builds <pkg> -y`.
- `pnpm dev` necesita Chrome o un `web-ext.config.ts` con la ruta a Edge/Brave. La máquina
  anterior solo tenía Edge. Si en la nueva hay Chrome, borra ese archivo.
- Los content scripts solo se inyectan en pestañas cargadas después de instalar o recargar la
  extensión. Para probar en Twitch, recarga la extensión y luego la pestaña.
- UIs en shadow root de WXT: su `:host { all: initial !important }` anula los estilos inline del
  host, incluido el `zIndex` que WXT mismo pone. Estilos y z-index van en el contenedor interno
  o en los elementos propios, nunca en `shadowHost.style`.
- Twitch pone el root font-size al 62.5%. Un plugin en `wxt.config.ts` convierte rem a px solo en
  el CSS del content script (en `writeBundle`: Vite emite ese CSS después de `generateBundle`).
- En los tests, `context.route('**/*')` también intercepta `chrome-extension://`; el fixture las
  deja pasar. Si añades rutas, no las bloquees.
- No hay Python en esta máquina; para ediciones con script usa Node o la herramienta Edit.
- Tailwind escanea solo `src/` y `entrypoints/` (`source(none)` + `@source` en los dos
  style.css). Así el CSS es idéntico en cualquier máquina y AMO puede reproducir el build.
  Si añades UI fuera de esas carpetas, añade su `@source`.
- El zip de fuentes sale desde la raíz del repo (`zip.sourcesRoot`). Si añades archivos que no
  deben ir a Mozilla, añádelos a `zip.excludeSources` en `wxt.config.ts`.

## Si el usuario pregunta cómo probar

`pnpm build`, cargar `apps/extension/.output/chrome-mv3` como extensión sin empaquetar, abrir el
popup desde una pestaña de un canal de Twitch, comprar un paquete, hacer un cheer, revisar el
historial. En un canal en vivo aparece el botón "Cheer (fake)" bajo el input del chat; al
enviar, sale una línea "LOCAL ONLY" en el chat propio. En la consola de la pestaña de Twitch debe
aparecer `[FakeBits] content script loaded on ...`.
