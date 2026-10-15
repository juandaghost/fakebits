import type { Go, ViewName } from './views';

const ITEMS: { name: ViewName; label: string }[] = [
  { name: 'home', label: 'Home' },
  { name: 'buy', label: 'Buy' },
  { name: 'cheer', label: 'Cheer' },
  { name: 'history', label: 'History' },
  { name: 'settings', label: 'Settings' },
];

export function Nav({ current, go }: { current: ViewName; go: Go }) {
  return (
    <nav class="grid grid-cols-5 border-t border-zinc-900 bg-zinc-950">
      {ITEMS.map((item) => {
        const active = item.name === current;
        return (
          <button
            key={item.name}
            type="button"
            onClick={() => go({ name: item.name })}
            aria-current={active ? 'page' : undefined}
            class={`py-2.5 text-xs font-medium transition ${
              active ? 'text-violet-400' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
