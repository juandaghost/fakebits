import { render } from 'preact';
import { channelFromTwitchUrl, loadSettings, type CheerEntry } from '@fakebits/core';
import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import {
  createShadowRootUi,
  type ShadowRootContentScriptUi,
} from 'wxt/utils/content-script-ui/shadow-root';
import {
  findChatButtonRow,
  findChatMessageList,
  readChannelIdentity,
} from '@/src/twitch/twitchDom';
import { ExtensionStorage } from '@/src/storage';
import { appendLocalChatLine } from './chatLine';
import { CheerButton } from './CheerButton';
import { CheerModal } from './CheerModal';

/** Above Twitch's own overlays and modals. */
const MODAL_Z_INDEX = 2147483000;

/** Mounted value is the container Preact rendered into, so onRemove can unmount it. */
type Ui = ShadowRootContentScriptUi<HTMLElement>;

const unmount = (container: HTMLElement | undefined) => {
  if (container) render(null, container);
};

/**
 * Keeps a "Cheer (fake)" button in Twitch's chat button row on channel pages.
 *
 * Twitch is a SPA: the chat mounts late, re-mounts on channel changes, and navigation
 * does not reload the page. A MutationObserver plus WXT's location-change event trigger
 * `sync`, coalesced to one run per animation frame. When the button is already in the
 * page for the current channel, `sync` returns after a couple of property reads.
 */
export function startInjector(ctx: ContentScriptContext): void {
  let button: { ui: Ui; channel: string } | undefined;
  let mounting = false;
  let modal: Ui | undefined;
  let opening = false;
  let queued = false;

  const closeModal = () => {
    modal?.remove();
    modal = undefined;
  };

  const openModal = async (channel: string) => {
    if (modal || opening) return;
    opening = true;
    try {
      modal = await createModal(channel);
      modal.mount();
    } finally {
      opening = false;
    }
  };

  const createModal = (channel: string) =>
    createShadowRootUi(ctx, {
      name: 'fakebits-modal',
      position: 'modal',
      anchor: 'body',
      isolateEvents: true,
      onMount: (container) => {
        // WXT's `zIndex` option styles the shadow host, where its own `:host { all: initial
        // !important }` reset cancels it, so Twitch's player overlays ended up on top. The
        // container is inside the shadow root and position: fixed, so its z-index holds.
        container.style.zIndex = String(MODAL_Z_INDEX);
        const onCheered = async (entry: CheerEntry) => {
          // Read at send time, so a name changed in the popup applies right away.
          const { displayName } = await loadSettings(new ExtensionStorage());
          const list = findChatMessageList();
          if (!list) return false;
          appendLocalChatLine(list, entry, displayName);
          return true;
        };
        render(
          <CheerModal
            channel={channel}
            identity={readChannelIdentity(channel)}
            onCheered={onCheered}
            onClose={closeModal}
          />,
          container,
        );
        return container;
      },
      onRemove: unmount,
    });

  const sync = async () => {
    const channel = channelFromTwitchUrl(location.href);
    if (button && button.ui.shadowHost.isConnected && button.channel === channel) return;

    if (button) {
      // Leaving the channel closes the modal; a re-rendered chat on the same channel does not.
      if (button.channel !== channel) closeModal();
      button.ui.remove();
      button = undefined;
    }
    if (!channel || mounting) return;

    const row = findChatButtonRow();
    if (!row) return; // Chat not rendered yet. The observer calls back when it is.

    mounting = true;
    try {
      const ui = await createShadowRootUi(ctx, {
        name: 'fakebits-cheer-button',
        position: 'inline',
        anchor: row,
        append: 'first',
        onMount: (container) => {
          render(<CheerButton onClick={() => void openModal(channel)} />, container);
          return container;
        },
        onRemove: unmount,
      });
      ui.mount();
      button = { ui, channel };
    } finally {
      mounting = false;
    }
    // The page may have moved on while the stylesheet loaded.
    schedule();
  };

  const schedule = () => {
    if (queued || !ctx.isValid) return;
    queued = true;
    ctx.requestAnimationFrame(() => {
      queued = false;
      void sync();
    });
  };

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true });
  ctx.addEventListener(window, 'wxt:locationchange', schedule);
  ctx.onInvalidated(() => {
    observer.disconnect();
    button?.ui.remove();
    closeModal();
  });
  schedule();
}
