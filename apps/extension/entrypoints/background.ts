import { defineBackground } from 'wxt/utils/define-background';

// Nothing to do in the background for the MVP. Kept so the manifest has a
// service worker entry and so later phases have a place for alarms/badges.
export default defineBackground(() => {
  // Intentionally empty.
});
