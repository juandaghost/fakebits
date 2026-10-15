import { cheermoteTier } from '@fakebits/core';

interface Props {
  bits: number;
  size?: number;
  class?: string;
}

/** A gem whose colour follows the cheermote tier for the amount. */
export function Cheermote({ bits, size = 40, class: className }: Props) {
  const tier = cheermoteTier(bits);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      class={className}
      role="img"
      aria-label={`${tier.name} cheermote`}
    >
      <polygon points="12,2 22,9 12,22 2,9" fill={tier.color} />
      <polygon points="12,2 17,9 12,13 7,9" fill="#fff" fill-opacity="0.35" />
      <polygon points="2,9 12,13 12,22" fill="#000" fill-opacity="0.18" />
    </svg>
  );
}
