import { normalizeChannel } from './wallet';

/** First path segments on twitch.tv that are pages, not channels. */
const RESERVED = new Set([
  'directory',
  'videos',
  'settings',
  'search',
  'downloads',
  'p',
  'drops',
  'subscriptions',
  'wallet',
  'inventory',
  'jobs',
  'turbo',
  'prime',
  'friends',
  'messages',
  'store',
  'bits',
  'bits-checkout',
  'events',
  'collections',
  'following',
  'creatorcamp',
  'broadcast',
  'login',
  'signup',
  'privacy',
  'terms',
  'legal',
  'about',
  'team',
  'teams',
  'products',
  'clip',
  'u',
  'dashboard',
]);

/** Segments after which the channel is the *next* segment, e.g. /popout/<channel>/chat. */
const CHANNEL_IS_NEXT = new Set(['popout', 'embed', 'moderator']);

/**
 * Pulls the channel login out of a twitch.tv URL, or undefined when the page is
 * not a channel. Works for www.twitch.tv and twitch.tv; other subdomains are
 * ignored on purpose (the extension only runs on www).
 */
export function channelFromTwitchUrl(url: string): string | undefined {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return undefined;
  }
  if (parsed.hostname !== 'www.twitch.tv' && parsed.hostname !== 'twitch.tv') return undefined;

  const segments = parsed.pathname.split('/').filter(Boolean);
  const first = segments[0]?.toLowerCase();
  if (!first) return undefined;

  const candidate = CHANNEL_IS_NEXT.has(first) ? segments[1] : first;
  if (!candidate || RESERVED.has(candidate.toLowerCase())) return undefined;

  try {
    return normalizeChannel(candidate);
  } catch {
    return undefined;
  }
}
