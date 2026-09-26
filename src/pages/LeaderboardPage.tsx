import { useState } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Link } from 'react-router';
import { useLeaderboardVolume } from '@/hooks/useLeaderboardVolume';
import type { VolumeWindow } from '@/services/leaderboard.service';
import { normalizeCreatorDisplayName } from '@/utils/creatorDisplayName.utils';
import { formatNumber, formatPercent, formatXlmPrice } from '@/utils/numberFormat.utils';
import CreatorInitialsAvatar from '@/components/common/CreatorInitialsAvatar';
import { cn } from '@/lib/utils';
import { useNavigationTiming } from '@/hooks/useNavigationTiming';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

const VOLUME_WINDOWS: { value: VolumeWindow; label: string }[] = [
	{ value: '24h', label: '24h' },
	{ value: '7d', label: '7d' },
];

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

const skeletonBlockClass =
	'rounded-md bg-white/12 skeleton-shimmer motion-reduce:bg-white/18 motion-reduce:ring-1 motion-reduce:ring-white/15';

function LeaderboardPageSkeletonRow() {
	return (
		<div className="flex items-center gap-4 border-b border-border px-4 py-3.5 last:border-b-0">
			<div className={cn('h-4 w-5 shrink-0', skeletonBlockClass)} />
			<div className="flex min-w-0 flex-1 items-center gap-3">
				<div className={cn('size-9 shrink-0 rounded-full', skeletonBlockClass)} />
				<div className={cn('h-4 w-32', skeletonBlockClass)} />
			</div>
			<div className={cn('h-4 w-16 shrink-0 hidden sm:block', skeletonBlockClass)} />
			<div className={cn('h-4 w-14 shrink-0 hidden md:block', skeletonBlockClass)} />
			<div className={cn('h-4 w-14 shrink-0 hidden md:block', skeletonBlockClass)} />
			<div className={cn('h-4 w-12 shrink-0', skeletonBlockClass)} />
		</div>
	);
}

/* ------------------------------------------------------------------ */
/*  Table header                                                       */
/* ------------------------------------------------------------------ */

interface LeaderboardPageHeaderRowProps {
	window: VolumeWindow;
}

function LeaderboardPageHeaderRow({ window }: LeaderboardPageHeaderRowProps) {
	return (
		<div
			aria-hidden="true"
			className="flex items-center gap-4 border-b border-border bg-muted/30 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
		>
			<span className="w-5 shrink-0 text-right">#</span>
			<span className="min-w-0 flex-1">Creator</span>
			<span className="hidden shrink-0 w-20 text-right sm:block">Price</span>
			<span className="hidden shrink-0 w-16 text-right md:block">24h Vol</span>
			<span className="hidden shrink-0 w-16 text-right md:block">7d Vol</span>
			<span className="shrink-0 w-16 text-right">Change ({window})</span>
		</div>
	);
}

/* ------------------------------------------------------------------ */
/*  Row                                                                */
/* ------------------------------------------------------------------ */

interface LeaderboardPageRowProps {
	rank: number;
	name: string;
	thumbnail?: string;
	creatorId: string;
	price: number;
	volume24h: number;
	volume7d: number;
	change24h: number;
	activeWindow: VolumeWindow;
}

function LeaderboardPageRow({
	rank,
	name,
	thumbnail,
	creatorId,
	price,
	volume24h,
	volume7d,
	change24h,
	activeWindow,
}: LeaderboardPageRowProps) {
	const changeColor =
		change24h > 0
			? 'text-emerald-600'
			: change24h < 0
				? 'text-red-500'
				: 'text-muted-foreground';

	return (
		<Link
			to={`/creator/${creatorId}`}
			className="flex items-center gap-4 border-b border-border px-4 py-3.5 transition-colors hover:bg-accent/40 last:border-b-0"
			aria-label={`${name} — rank ${rank}`}
		>
			{/* Rank */}
			<span className="w-5 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground">
				{rank}
			</span>

			{/* Avatar + Name */}
			<div className="flex min-w-0 flex-1 items-center gap-3">
				<div className="size-9 shrink-0 overflow-hidden rounded-full bg-muted">
					<CreatorInitialsAvatar
						name={name}
						creatorId={creatorId}
						imageSrc={thumbnail}
					/>
				</div>
				<span className="min-w-0 truncate font-jakarta text-sm font-medium">
					{name}
				</span>
			</div>

			{/* Price */}
			<span className="hidden w-20 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground sm:block">
				{formatXlmPrice(price)}
			</span>

			{/* 24h Volume */}
			<span
				className={cn(
					'hidden w-16 shrink-0 text-right font-mono text-xs tabular-nums md:block',
					activeWindow === '24h' ? 'font-semibold text-foreground' : 'text-muted-foreground'
				)}
			>
				{formatNumber(volume24h, { style: 'compact' })}
			</span>

			{/* 7d Volume */}
			<span
				className={cn(
					'hidden w-16 shrink-0 text-right font-mono text-xs tabular-nums md:block',
					activeWindow === '7d' ? 'font-semibold text-foreground' : 'text-muted-foreground'
				)}
			>
				{formatNumber(volume7d, { style: 'compact' })}
			</span>

			{/* Price change */}
			<span
				className={cn(
					'w-16 shrink-0 text-right font-mono text-xs tabular-nums',
					changeColor
				)}
			>
				{formatPercent(change24h, { signed: true })}
			</span>
		</Link>
	);
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function LeaderboardPage() {
	useNavigationTiming('leaderboard');
	useDocumentTitle('Leaderboard — AccessLayer');

	const [activeWindow, setActiveWindow] = useState<VolumeWindow>('24h');
	const { data: entries, isLoading, isFetching } = useLeaderboardVolume(activeWindow);

	const isRefreshing = isFetching && !isLoading;

	return (
		<main className="mx-auto max-w-2xl px-6 py-16">
			{/* Back link */}
			<Link
				to="/"
				className="mb-6 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
			>
				<ArrowLeft className="size-3.5" />
				Back to home
			</Link>

			{/* Header */}
			<div className="mb-6 flex flex-wrap items-end justify-between gap-4">
				<div>
					<h1 className="font-jakarta text-2xl font-semibold">Leaderboard</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Top creator keys ranked by trading volume
					</p>
				</div>

				{/* Refresh status badge */}
				<span
					role="status"
					aria-live="polite"
					aria-busy={isRefreshing || undefined}
					data-testid="leaderboard-refresh-status"
					className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
				>
					{isRefreshing ? (
						<RefreshCw
							className="size-3 animate-spin motion-reduce:animate-none"
							aria-hidden="true"
						/>
					) : (
						<span
							className="size-1.5 animate-pulse rounded-full bg-emerald-400 motion-reduce:animate-none"
							aria-hidden="true"
						/>
					)}
					{isRefreshing ? 'Refreshing…' : 'Updates every 60s'}
				</span>
			</div>

			{/* 24h / 7d toggle */}
			<div
				role="group"
				aria-label="Volume ranking window"
				className="mb-5 inline-flex overflow-hidden rounded-lg border border-border"
			>
				{VOLUME_WINDOWS.map(({ value, label }) => (
					<button
						key={value}
						type="button"
						onClick={() => setActiveWindow(value)}
						aria-pressed={activeWindow === value}
						className={cn(
							'px-5 py-2 text-xs font-semibold uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
							activeWindow === value
								? 'bg-foreground text-background'
								: 'text-muted-foreground hover:text-foreground'
						)}
					>
						{label}
					</button>
				))}
			</div>

			{/* Loading skeleton */}
			{isLoading && (
				<div
					role="status"
					aria-label="Loading leaderboard"
					className="overflow-hidden rounded-xl border border-border"
				>
					<span className="sr-only">Loading leaderboard</span>
					{Array.from({ length: 20 }).map((_, i) => (
						<LeaderboardPageSkeletonRow key={i} />
					))}
				</div>
			)}

			{/* Empty state */}
			{!isLoading && (!entries || entries.length === 0) && (
				<div className="flex flex-col items-center gap-3 rounded-xl border border-border py-16 text-center">
					<p className="text-sm text-muted-foreground">
						No leaderboard data available
					</p>
				</div>
			)}

			{/* Table */}
			{!isLoading && entries && entries.length > 0 && (
				<div
					className="overflow-hidden rounded-xl border border-border"
					aria-label="Trading volume leaderboard"
				>
					<LeaderboardPageHeaderRow window={activeWindow} />
					{entries.map(entry => (
						<LeaderboardPageRow
							key={entry.id}
							rank={entry.rank}
							name={
								normalizeCreatorDisplayName(entry.title) || 'Unnamed creator'
							}
							thumbnail={entry.thumbnail}
							creatorId={entry.id}
							price={entry.price}
							volume24h={entry.volume24h ?? entry.totalVolume}
							volume7d={entry.volume7d ?? 0}
							change24h={entry.change24h}
							activeWindow={activeWindow}
						/>
					))}
				</div>
			)}
		</main>
	);
}
