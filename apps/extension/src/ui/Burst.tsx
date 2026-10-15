import { useMemo } from 'preact/hooks';

const COLORS = ['#9c3ee8', '#1db2a5', '#0099fe', '#f43021', '#fbbf24', '#f472b6'];

/** One-shot confetti burst. Mount it when something worth celebrating happened. */
export function Burst({ count = 18 }: { count?: number }) {
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
        const distance = 60 + Math.random() * 50;
        return {
          dx: `${Math.cos(angle) * distance}px`,
          dy: `${Math.sin(angle) * distance}px`,
          color: COLORS[i % COLORS.length]!,
          delay: `${Math.random() * 80}ms`,
        };
      }),
    [count],
  );

  return (
    <div class="pointer-events-none absolute inset-0" aria-hidden="true">
      {particles.map((p, i) => (
        <span
          key={i}
          class="fb-particle"
          style={{
            '--dx': p.dx,
            '--dy': p.dy,
            background: p.color,
            animationDelay: p.delay,
          }}
        />
      ))}
    </div>
  );
}
