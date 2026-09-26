import React, { useMemo } from 'react';
import { ArrowLeftRight, ClockIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/common/EmptyState';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/utils/time.utils';
import { formatNumber } from '@/utils/numberFormat.utils';
import type { SwapHistoryEntry } from '@/types/atomicSwap';
import { useAtomicSwapHistory } from '@/hooks/useAtomicSwap';

// ─── helpers ──────────────────────────────────────────────────────────────────

function SwapTypePill() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-400">
      <ArrowLeftRight className="size-3" aria-hidden="true" />
      Atomic Swap
    </span>
  );
}

// ─── skeleton loader ───────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 animate-pulse" aria-hidden="true">
      <div className="h-4 w-20 animate-pulse rounded bg-white/10" />
      <div className="h-4 w-16 animate-pulse rounded bg-white/10" />
      <div className="h-4 w-16 animate-pulse rounded bg-white/10" />
      <div className="h-4 w-20 animate-pulse rounded bg-white/10" />
      <div className="ml-auto h-4 w-24 animate-pulse rounded bg-white/10" />
    </div>
  );
}

// ─── single row ───────────────────────────────────────────────────────────────

interface SwapRowProps {
  swap: SwapHistoryEntry;
}

function SwapRow({ swap }: SwapRowProps) {
  return (
    <div
      data-testid={`swap-row-${swap.id}`}
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 pl-5 transition-colors hover:border-white/20 hover:bg-white/[0.04] sm:flex-row sm:items-center sm:justify-between',
        'border-l-4 border-l-amber-400'
      )}
    >
      {/* Keys exchanged */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <SwapTypePill />
          <span className="truncate text-sm font-semibold text-white">
            {swap.offeredKeyName} ↔ {swap.receivedKeyName}
          </span>
        </div>
        <div className="mt-1 text-xs text-white/55">
          Atomic swap
        </div>
      </div>

      {/* Numeric columns */}
      <div className="flex items-center gap-4 text-xs text-white/60 sm:gap-6">
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">You gave</span>
          <span className="font-mono text-white/80">{formatNumber(swap.offeredAmount)} {swap.offeredKeyName}</span>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">You received</span>
          <span className="font-mono text-white/80">{formatNumber(swap.receivedAmount)} {swap.receivedKeyName}</span>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">When</span>
          <span className="font-mono text-white/60" title={new Date(swap.timestamp).toLocaleString()}>
            {formatRelativeTime(swap.timestamp)}
          </span>
        </div>

        <div className="flex flex-col items-end ml-auto">
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">Status</span>
          <span className={cn('font-mono font-semibold', swap.status === 'completed' ? 'text-emerald-400' : 'text-rose-400')}>
            {swap.status}
          </span>
        </div>
      </div>

      {/* Expanded details */}
      <details className="group mt-4 pt-4 border-t border-white/10 sm:hidden">
        <summary className="flex items-center justify-between cursor-pointer list-none">
          <span className="text-xs text-white/60">Details</span>
          <span className="text-white/40">▼</span>
        </summary>
        <div className="mt-3 grid gap-2 text-xs text-white/70">
          <div><span className="text-white/40">Proposer: </span><span className="font-mono">{swap.proposerAddress.slice(0, 8)}…{swap.proposerAddress.slice(-6)}</span></div>
          <div><span className="text-white/40">Counterparty: </span><span className="font-mono">{swap.counterpartyAddress.slice(0, 8)}…{swap.counterpartyAddress.slice(-6)}</span></div>
          <div><span className="text-white/40">Tx hash: </span><span className="font-mono">{swap.transactionHash}</span></div>
        </div>
      </details>
    </div>
  );
}

// ─── main component ────────────────────────────────────────────────────────────

interface AtomicSwapHistoryProps {
  walletAddress: string;
}

const AtomicSwapHistory: React.FC<AtomicSwapHistoryProps> = ({ walletAddress }) => {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } = useAtomicSwapHistory(walletAddress);

  const swaps = useMemo(() => {
    const seen = new Set<string>();
    const result: SwapHistoryEntry[] = [];
    for (const page of data?.pages ?? []) {
      for (const swap of page.swaps) {
        if (seen.has(swap.id)) continue;
        seen.add(swap.id);
        result.push(swap);
      }
    }
    return result;
  }, [data]);

  if (isLoading) {
    return (
      <section className="space-y-2" aria-label="Loading atomic swap history" aria-busy="true">
        {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
      </section>
    );
  }

  if (isError) {
    return (
      <EmptyState
        title="Couldn't load swap history"
        description="There was a problem fetching your atomic swaps. Please try again shortly."
        data-testid="atomic-swap-history-error"
      />
    );
  }

  if (swaps.length === 0) {
    return (
      <EmptyState
        title="No atomic swaps yet"
        description="Your completed atomic swaps will appear here."
        data-testid="atomic-swap-history-empty"
      />
    );
  }

  return (
    <section aria-label="Atomic swap history">
      {/* Column header row */}
      <div className="mb-2 hidden items-center gap-4 px-5 text-[10px] font-bold uppercase tracking-widest text-white/30 sm:flex sm:justify-between">
        <span className="flex-1">Exchange</span>
        <div className="flex items-center gap-4 sm:gap-6">
          <span className="w-20 text-right">You gave</span>
          <span className="w-20 text-right">You received</span>
          <span className="w-24 text-right">
            <ClockIcon className="size-3 inline-block" aria-hidden="true" />
            When
          </span>
          <span className="w-16 text-right">Status</span>
        </div>
      </div>

      <div className="space-y-2" data-testid="atomic-swap-history-list">
        {swaps.map(swap => <SwapRow key={swap.id} swap={swap} />)}
      </div>

      {hasNextPage && (
        <div className="mt-6 flex justify-center">
          <Button
            variant="outline"
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
            data-testid="atomic-swap-history-load-more"
            className="rounded-xl border-white/15 bg-white/5 px-8 text-white/80 hover:bg-white/10 hover:text-white"
          >
            {isFetchingNextPage ? 'Loading…' : 'Load More'}
          </Button>
        </div>
      )}
    </section>
  );
};

export default AtomicSwapHistory;