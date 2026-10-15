import { defineContentScript } from 'wxt/utils/define-content-script';
import { startInjector } from '@/src/onpage/injector';
import './style.css';

// Adds the "Cheer (fake)" button next to Twitch's chat input. Everything it "sends" is
// rendered in this tab only (hard rule 1): Twitch's own input and APIs are never touched.
export default defineContentScript({
  matches: ['https://www.twitch.tv/*'],
  // Styles go into each UI's shadow root, never into Twitch's document.
  cssInjectionMode: 'ui',
  main(ctx) {
    // console.info, not console.debug: DevTools hides debug output unless "Verbose" is enabled.
    console.info('[FakeBits] content script loaded on', location.href);
    startInjector(ctx);
  },
});
