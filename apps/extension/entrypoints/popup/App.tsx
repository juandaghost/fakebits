import { useState } from 'preact/hooks';
import { Buy } from '@/src/ui/Buy';
import { Cheer } from '@/src/ui/Cheer';
import { History } from '@/src/ui/History';
import { Home } from '@/src/ui/Home';
import { Nav } from '@/src/ui/Nav';
import { Settings } from '@/src/ui/Settings';
import { useWallet } from '@/src/ui/useWallet';
import type { View } from '@/src/ui/views';

export function App() {
  const wallet = useWallet();
  const [view, setView] = useState<View>({ name: 'home' });

  const screen = () => {
    if (!wallet.ready) return <p class="py-10 text-center text-sm text-zinc-600">Loading…</p>;
    switch (view.name) {
      case 'home':
        return <Home wallet={wallet} go={setView} />;
      case 'buy':
        return <Buy wallet={wallet} go={setView} />;
      case 'cheer':
        return <Cheer wallet={wallet} go={setView} initialChannel={view.channel} />;
      case 'history':
        return <History wallet={wallet} initialChannel={view.channel} />;
      case 'settings':
        return <Settings wallet={wallet} />;
    }
  };

  return (
    <div class="flex h-[560px] w-[360px] flex-col bg-zinc-950 text-zinc-100">
      <header class="flex items-center justify-between px-4 pt-3 pb-2">
        <h1 class="text-base font-bold tracking-tight">FakeBits</h1>
        <span class="rounded bg-zinc-800 px-2 py-0.5 text-[10px] tracking-wide text-zinc-400 uppercase">
          simulation
        </span>
      </header>

      <main class="flex-1 overflow-y-auto px-4 pb-4">{screen()}</main>

      <Nav current={view.name} go={setView} />
      <footer class="px-4 py-1.5 text-center text-[10px] leading-snug text-zinc-600">
        Not affiliated with Twitch. Nothing is sent anywhere. No real money.
      </footer>
    </div>
  );
}
