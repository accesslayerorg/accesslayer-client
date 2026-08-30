import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router';
import { useLeaderboardVolume } from '@/hooks/useLeaderboardVolume';
import { normalizeCreatorDisplayName } from '@/utils/creatorDisplayName.utils';
import { formatNumber, formatPercent } from '@/utils/numberFormat.utils';
import CreatorInitialsAvatar from '@/components/common/CreatorInitialsAvatar';
import { cn } from '@/lib/utils';
import { useNavigationTiming } from '@/hooks/useNavigationTiming';

/* ------------------------------------------------------------------ */
/*  Skeleton                                                          */
/* ------------------------------------------------------------------ */

const skeletonBlockClass =
	'rounded-md bg-white/12 skeleton-shimmer motion-reduce:bg-white/18 motion-reduce:ring-1 motion-reduce:ring-white/15';

function LeaderboardPageSkeletonRow() {
	return (
		<div className="flex items-center gap-4 border-b border-border px-4 py-3.5 last:border-b-0">
			<div className={cn('h-5 w-6 shrink-0', skeletonBlockClass)} />
			<div className={cn('size-9 shrink-0 rounded-full', skeletonBlockClass)} />
			<div className="min-w-0 flex-1 space-y-1.5">
				<div className={cn('h-4 w-36', skeletonBlockClass)} />
			</div>
			<div className={cn('h-4 w-16', skeletonBlockClass)} />
			<div className={cn('h-4 w-14', skeletonBlockClass)} />
		</div>
	);
}

/* ------------------------------------------------------------------ */
/*  Row                                                               */
/* ------------------------------------------------------------------ */

interface LeaderboardPageRowProps {
	rank: number;
	name: string;
	thumbnail?: string;
	creatorId: string;
	volume: number;
	change24h: number;
}

function LeaderboardPageRow({
	rank,
	name,
	thumbnail,
	creatorId,
	volume,
	change24h,
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
		>
			{/* Rank */}
			<span className="w-6 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground">
				{rank}
			</span>

			{/* Avatar */}
			<div className="size-9 shrink-0 overflow-hidden rounded-full bg-muted">
				<CreatorInitialsAvatar
					name={name}
					creatorId={creatorId}
					imageSrc={thumbnail}
				/>
			</div>

			{/* Name */}
			<span className="min-w-0 flex-1 truncate font-jakarta text-sm font-medium">
				{name}
			</span>

			{/* Volume */}
			<span className="hidden shrink-0 font-mono text-xs tabular-nums text-muted-foreground sm:block">
				{formatNumber(volume, { style: 'compact' })}
			</span>

			{/* 24h Change */}
			<span className={cn('w-16 shrink-0 text-right font-mono text-xs tabular-nums', changeColor)}>
				{formatPercent(change24h, { signed: true })}
			</span>
		</Link>
	);
}

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function LeaderboardPage() {
	useNavigationTiming('leaderboard');

	const { data: entries, isLoading } = useLeaderboardVolume();

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

			<div className="mb-8">
				<h1 className="font-jakarta text-2xl font-semibold">
					Leaderboard
				</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Top creator keys ranked by trading volume
				</p>
			</div>

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

			{!isLoading && (!entries || entries.length === 0) && (
				<div className="flex flex-col items-center gap-3 rounded-xl border border-border py-16 text-center">
					<p className="text-sm text-muted-foreground">
						No leaderboard data available
					</p>
				</div>
			)}

			{!isLoading && entries && entries.length > 0 && (
				<div className="overflow-hidden rounded-xl border border-border">
					{entries.map(entry => (
						<LeaderboardPageRow
							key={entry.id}
							rank={entry.rank}
							name={
								normalizeCreatorDisplayName(entry.title) ||
								'Unnamed creator'
							}
							thumbnail={entry.thumbnail}
							creatorId={entry.id}
							volume={entry.totalVolume}
							change24h={entry.change24h}
						/>
					))}
				</div>
			)}
		</main>
	);
}
