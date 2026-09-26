// src/components/common/WalletActivityFeed.tsx
import { useMemo, useState } from 'react';
import { History } from 'lucide-react';
import { cn } from '@/lib/utils';
import ActivityItem from '@/components/common/ActivityItem';
import EmptyState from '@/components/common/EmptyState';
import { useWalletActivity } from '@/hooks/useWallet';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import type {
	WalletActivityTrade,
	WalletActivityEventType,
} from '@/services/walletActivity.service';

// ─── Filter config ─────────────────────────────────────────────────────────────

type FilterValue = WalletActivityEventType | 'all';

interface FilterTab {
	value: FilterValue;
	label: string;
}

const FILTER_TABS: FilterTab[] = [
	{ value: 'all', label: 'All' },
	{ value: 'buy', label: 'Buys' },
	{ value: 'sell', label: 'Sells' },
	{ value: 'stake', label: 'Stakes' },
	{ value: 'unstake', label: 'Unstakes' },
	{ value: 'claim', label: 'Claims' },
	{ value: 'governance_vote', label: 'Votes' },
];

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonItem() {
	return (
		<div
			className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 pl-5"
			aria-hidden="true"
		>
			<div className="size-9 shrink-0 animate-pulse rounded-full bg-white/10" />
			<div className="flex-1 space-y-2">
				<div className="h-4 w-1/3 animate-pulse rounded bg-white/10" />
				<div className="h-3 w-1/2 animate-pulse rounded bg-white/10" />
			</div>
			<div className="space-y-1 text-right">
				<div className="h-3 w-16 animate-pulse rounded bg-white/10" />
				<div className="h-3 w-20 animate-pulse rounded bg-white/10" />
			</div>
		</div>
	);
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface WalletActivityFeedProps {
	/** Connected wallet address used as the cache key for the activity query. */
	address: string;
}

// ─── Main component ────────────────────────────────────────────────────────────

/**
 * Wallet activity feed — shows a reverse-chronological list of all trading
 * and staking events for a given wallet address.
 *
 * Features:
 *   - Filter tabs for each event type (all / buy / sell / stake / unstake / claim / vote)
 *   - Infinite scroll via IntersectionObserver sentinel
 *   - Per-row Stellar Expert explorer links
 *   - Empty state when wallet has no activity
 */
const WalletActivityFeed: React.FC<WalletActivityFeedProps> = ({ address }) => {
	const [activeFilter, setActiveFilter] = useState<FilterValue>('all');

	const {
		data,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		isLoading,
		isError,
	} = useWalletActivity(address);

	// Flatten pages and deduplicate by id defensively against overlapping cursors.
	const allEntries = useMemo<WalletActivityTrade[]>(() => {
		const seen = new Set<string>();
		const result: WalletActivityTrade[] = [];
		for (const page of data?.pages ?? []) {
			for (const trade of page.trades) {
				if (seen.has(trade.id)) continue;
				seen.add(trade.id);
				result.push(trade);
			}
		}
		// Ensure reverse-chronological order across pages
		return result.sort((a, b) => b.timestamp - a.timestamp);
	}, [data]);

	// Client-side filter — the API returns all types, we filter locally so
	// switching filters doesn't cause extra network requests.
	const filteredEntries = useMemo(
		() =>
			activeFilter === 'all'
				? allEntries
				: allEntries.filter(e => e.type === activeFilter),
		[allEntries, activeFilter]
	);

	// Sentinel ref for infinite scroll; only active when we can still fetch more.
	const sentinelRef = useInfiniteScroll<HTMLDivElement>({
		enabled: !isFetchingNextPage && !isLoading,
		hasMore: !!hasNextPage,
		onLoadMore: () => void fetchNextPage(),
	});

	// ── Loading state ────────────────────────────────────────────────────────
	if (isLoading) {
		return (
			<section
				className="space-y-2"
				aria-label="Loading activity feed"
				aria-busy="true"
			>
				<FilterBar
					active={activeFilter}
					onChange={setActiveFilter}
					disabled
				/>
				<div className="mt-4 space-y-2">
					{Array.from({ length: 5 }).map((_, i) => (
						<SkeletonItem key={i} />
					))}
				</div>
			</section>
		);
	}

	// ── Error state ──────────────────────────────────────────────────────────
	if (isError) {
		return (
			<EmptyState
				title="Couldn't load activity"
				description="There was a problem fetching your wallet activity. Please try again shortly."
				data-testid="activity-feed-error"
			/>
		);
	}

	// ── Empty wallet state ───────────────────────────────────────────────────
	if (allEntries.length === 0) {
		return (
			<div
				data-testid="activity-feed-empty"
				className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] py-14 text-center"
			>
				<div className="flex size-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/30">
					<History className="size-6" aria-hidden="true" />
				</div>
				<p className="text-sm text-white/50">
					No activity yet — buy, stake, or vote to get started
				</p>
			</div>
		);
	}

	// ── Empty filtered state ─────────────────────────────────────────────────
	const showFilteredEmpty = filteredEntries.length === 0;

	return (
		<section aria-label="Wallet activity feed">
			<FilterBar active={activeFilter} onChange={setActiveFilter} />

			<div className="mt-4 space-y-2" data-testid="activity-feed-list">
				{showFilteredEmpty ? (
					<div
						data-testid="activity-feed-filter-empty"
						className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.02] py-10 text-center"
					>
						<p className="text-sm text-white/50">
							No {FILTER_TABS.find(t => t.value === activeFilter)?.label.toLowerCase()} events found
						</p>
					</div>
				) : (
					filteredEntries.map(entry => (
						<ActivityItem key={entry.id} entry={entry} />
					))
				)}
			</div>

			{/* Infinite scroll sentinel — only rendered when there are more pages */}
			{hasNextPage && (
				<div
					ref={sentinelRef}
					data-testid="activity-feed-sentinel"
					aria-hidden="true"
					className="h-px w-full"
				/>
			)}

			{/* Visible loading indicator while next page is in flight */}
			{isFetchingNextPage && (
				<div
					className="mt-4 space-y-2"
					aria-label="Loading more activity"
					aria-live="polite"
				>
					{Array.from({ length: 3 }).map((_, i) => (
						<SkeletonItem key={i} />
					))}
				</div>
			)}
		</section>
	);
};

export default WalletActivityFeed;

// ─── Filter bar ───────────────────────────────────────────────────────────────

interface FilterBarProps {
	active: FilterValue;
	onChange: (value: FilterValue) => void;
	disabled?: boolean;
}

function FilterBar({ active, onChange, disabled = false }: FilterBarProps) {
	return (
		<div
			role="tablist"
			aria-label="Filter activity by type"
			className="flex flex-wrap gap-2"
		>
			{FILTER_TABS.map(tab => (
				<button
					key={tab.value}
					type="button"
					role="tab"
					id={`activity-filter-${tab.value}`}
					aria-selected={active === tab.value}
					disabled={disabled}
					onClick={() => onChange(tab.value)}
					data-testid={`activity-filter-${tab.value}`}
					className={cn(
						'rounded-full border px-3.5 py-1.5 text-xs font-semibold font-jakarta transition-all duration-200 outline-none',
						'focus-visible:ring-2 focus-visible:ring-amber-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#06111f]',
						'disabled:cursor-not-allowed disabled:opacity-40',
						active === tab.value
							? 'border-amber-400/30 bg-amber-400/15 text-white'
							: 'border-white/10 bg-white/[0.06] text-white/60 hover:border-white/20 hover:bg-white/10 hover:text-white/80'
					)}
				>
					{tab.label}
				</button>
			))}
		</div>
	);
}
