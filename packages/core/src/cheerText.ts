import { MAX_CHEER_BITS } from './wallet';

/**
 * Twitch's cheer syntax: "cheer" followed by the amount, as a word of its own, any case.
 * "cheer100", "Cheer100" and "CHEER100" count; "cheer100!" and "mycheer100" do not.
 */
const CHEER_TOKEN = /(?<=^|\s)cheer(\d+)(?=\s|$)/gi;

/**
 * Bits a chat message cheers, or undefined when it has no cheer token. Several tokens add
 * up, as on Twitch. The total is capped at MAX_CHEER_BITS.
 */
export function cheerAmountFromMessage(message: string): number | undefined {
  let total = 0;
  for (const match of message.matchAll(CHEER_TOKEN)) total += Number(match[1]);
  return total > 0 ? Math.min(total, MAX_CHEER_BITS) : undefined;
}
