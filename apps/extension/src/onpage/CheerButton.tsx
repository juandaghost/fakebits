import { Cheermote } from '@/src/ui/Cheermote';

/** Sits in Twitch's chat button row. Opens the fake cheer modal. */
export function CheerButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="FakeBits simulation: nothing is sent to Twitch and no money is charged"
      class="fb-root mr-2 inline-flex h-[30px] items-center gap-1 rounded-md bg-violet-600 px-2 text-[13px] font-semibold whitespace-nowrap text-white transition hover:bg-violet-500 focus-visible:outline-2 focus-visible:outline-violet-300"
    >
      <Cheermote bits={100} size={16} />
      Cheer (fake)
    </button>
  );
}
