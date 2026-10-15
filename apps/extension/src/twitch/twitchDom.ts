/**
 * Every Twitch DOM selector the extension depends on lives in this file (PLAN.md section 8).
 * Twitch ships UI changes often. When the injection breaks, this is the file to fix.
 *
 * Each lookup tries its selectors from most to least specific and returns undefined when
 * none match, so a broken selector degrades to "no button on the page", never to an error.
 * The popup keeps working regardless.
 *
 * Read-only by design: nothing here touches Twitch's chat input (hard rule 1).
 */
export const SELECTORS = {
  /** Row of buttons under the chat input (bits, settings, the real "Chat" button). */
  chatInputButtons: [
    '[data-test-selector="chat-input-buttons-container"]',
    '.chat-input__buttons-container',
  ],
  /** Twitch's own send button, used only to locate the row when the container moved. */
  chatSendButton: ['[data-a-target="chat-send-button"]'],
  /** The list chat messages are rendered into. Local lines are appended here. */
  chatMessages: [
    '[data-test-selector="chat-scrollable-area__message-container"]',
    '.chat-scrollable-area__message-container',
  ],
  /** Heading that holds the channel's display name on channel pages. */
  displayName: ['.channel-info-content h1', 'h1.tw-title'],
  /** Avatar images. The channel's own one has the display name or login as alt text. */
  avatar: ['img.tw-image-avatar'],
} as const;

function first(selectors: readonly string[], root: ParentNode): Element | undefined {
  for (const selector of selectors) {
    const found = root.querySelector(selector);
    if (found) return found;
  }
  return undefined;
}

/** Element the "Cheer (fake)" button is inserted into, as its first child. */
export function findChatButtonRow(root: ParentNode = document): Element | undefined {
  return (
    first(SELECTORS.chatInputButtons, root) ??
    first(SELECTORS.chatSendButton, root)?.parentElement ??
    undefined
  );
}

/** Container chat lines are rendered into. */
export function findChatMessageList(root: ParentNode = document): Element | undefined {
  return first(SELECTORS.chatMessages, root);
}

export interface ChannelIdentity {
  displayName: string;
  avatarUrl?: string;
}

/**
 * Display name and avatar for `channel` (a login), read from the page. Only accepts
 * values that clearly belong to that channel, so a stray heading or someone else's
 * avatar is never shown. Falls back to the login.
 */
export function readChannelIdentity(channel: string, root: ParentNode = document): ChannelIdentity {
  const matches = (text: string | null | undefined) => text?.trim().toLowerCase() === channel;

  let displayName = channel;
  for (const selector of SELECTORS.displayName) {
    const heading = root.querySelector(selector);
    if (heading && matches(heading.textContent)) {
      displayName = heading.textContent!.trim();
      break;
    }
  }

  let avatarUrl: string | undefined;
  for (const selector of SELECTORS.avatar) {
    for (const img of root.querySelectorAll<HTMLImageElement>(selector)) {
      if (matches(img.alt) && img.src.startsWith('https://')) {
        avatarUrl = img.src;
        break;
      }
    }
    if (avatarUrl) break;
  }

  return avatarUrl ? { displayName, avatarUrl } : { displayName };
}
