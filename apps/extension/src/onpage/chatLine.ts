import { CHEERMOTE_TIERS, cheermoteTier, type CheerEntry } from '@fakebits/core';

/** Attribute on every node FakeBits adds to Twitch's chat. */
export const LOCAL_LINE_ATTR = 'data-fakebits';

// Text colour is inherited from Twitch's chat, so the line follows its light/dark theme.
const STYLE = `
  :host { display: block; }
  .line {
    margin: 2px 0;
    padding: 5px 20px 5px 17px;
    border-left: 3px solid var(--tier);
    background: rgba(139, 92, 246, 0.12);
    animation: fb-line-in 1.4s ease-out;
    font: 13px/20px Inter, Roobert, 'Helvetica Neue', Helvetica, Arial, sans-serif;
    overflow-wrap: anywhere;
  }
  .badge {
    display: inline-block;
    margin-right: 6px;
    padding: 0 5px;
    border-radius: 3px;
    background: #3f3f46;
    color: #f4f4f5;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.04em;
    line-height: 16px;
    text-transform: uppercase;
    vertical-align: 1px;
  }
  .name { color: #a78bfa; font-weight: 700; }
  .bits { font-weight: 700; white-space: nowrap; }
  .bits svg {
    width: var(--gem);
    height: var(--gem);
    margin: 0 2px;
    vertical-align: calc((20px - var(--gem)) / 2 - 5px);
  }
  /* The line arrives lit in its tier colour and settles into the standard tint. */
  @keyframes fb-line-in {
    from { background-color: var(--flash); transform: translateX(-6px); }
    40% { transform: none; }
  }
  @media (prefers-reduced-motion: reduce) {
    .line { animation: none; }
  }
`;

/** Gem size grows with the tier, like Twitch's cheermotes: 18px for 1 bit up to 30px. */
const gemSize = (bits: number) => 18 + CHEERMOTE_TIERS.indexOf(cheermoteTier(bits)) * 3;

/** "#rrggbb" plus alpha as an rgba() string. */
function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function gem(color: string): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const shapes: [string, string, string][] = [
    ['12,2 22,9 12,22 2,9', color, '1'],
    ['12,2 17,9 12,13 7,9', '#fff', '0.35'],
    ['2,9 12,13 12,22', '#000', '0.18'],
  ];
  for (const [points, fill, opacity] of shapes) {
    const polygon = document.createElementNS(SVG_NS, 'polygon');
    polygon.setAttribute('points', points);
    polygon.setAttribute('fill', fill);
    polygon.setAttribute('fill-opacity', opacity);
    svg.append(polygon);
  }
  return svg;
}

function span(className: string, text?: string): HTMLSpanElement {
  const el = document.createElement('span');
  el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

/**
 * Builds the chat line for a fake cheer. It is a node in this tab only, never posted.
 * The message goes in via textContent, never as HTML.
 */
export function createLocalChatLine(entry: CheerEntry, viewerName: string): HTMLElement {
  const host = document.createElement('div');
  host.setAttribute(LOCAL_LINE_ATTR, 'cheer');
  host.dataset['fakebitsId'] = entry.id;
  host.title = 'Added by FakeBits in this tab only. Nobody else can see it.';

  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = STYLE;

  const tier = cheermoteTier(entry.bits);
  const bits = span('bits');
  bits.style.color = tier.color;
  bits.append(gem(tier.color), String(entry.bits));

  const line = document.createElement('div');
  line.className = 'line';
  line.style.setProperty('--tier', tier.color);
  line.style.setProperty('--flash', withAlpha(tier.color, 0.45));
  line.style.setProperty('--gem', `${gemSize(entry.bits)}px`);
  line.append(span('badge', 'local only'), span('name', viewerName), ': ', bits);
  if (entry.message) line.append(' ', span('message', entry.message));

  shadow.append(style, line);
  return host;
}

/** Appends the line to Twitch's chat list and scrolls it into view. */
export function appendLocalChatLine(list: Element, entry: CheerEntry, viewerName: string): void {
  const line = createLocalChatLine(entry, viewerName);
  list.append(line);
  line.scrollIntoView({ block: 'nearest' });
}
