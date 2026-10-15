import { CHEERMOTE_TIERS, cheermoteTier, loadSettings } from '@fakebits/core';
import { ExtensionStorage } from '@/src/storage';

// Sounds are synthesized with Web Audio: no audio files to ship and nothing fetched.
// They always follow a click, so autoplay rules allow them in the popup and on twitch.tv.

export type Cue = 'purchase' | 'cheer';

let context: AudioContext | undefined;

function audio(): AudioContext {
  context ??= new AudioContext();
  if (context.state === 'suspended') void context.resume();
  return context;
}

function note(
  ctx: AudioContext,
  frequency: number,
  start: number,
  duration: number,
  volume = 0.18,
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = frequency;
  const t = ctx.currentTime + start;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

/** Two quick high notes, like a register. */
function purchase(ctx: AudioContext) {
  note(ctx, 1318.5, 0, 0.12);
  note(ctx, 1760, 0.09, 0.35);
}

/** A rising arpeggio: one more note, and a higher start, per cheermote tier. */
function cheer(ctx: AudioContext, bits: number) {
  const tier = CHEERMOTE_TIERS.indexOf(cheermoteTier(bits));
  const base = 523.25 * 2 ** (tier / 6);
  const steps = [1, 5 / 4, 3 / 2, 2, 5 / 2, 3].slice(0, tier + 2);
  steps.forEach((ratio, i) => note(ctx, base * ratio, i * 0.07, 0.4 - i * 0.03));
}

/** Plays the cue unless the user turned sound off. Never throws: sound is decoration. */
export async function play(cue: Cue, bits = 100, force = false): Promise<void> {
  try {
    if (!force && !(await loadSettings(new ExtensionStorage())).sound) return;
    const ctx = audio();
    if (cue === 'purchase') purchase(ctx);
    else cheer(ctx, bits);
  } catch {
    // No audio device, blocked context, storage unavailable: stay silent.
  }
}
