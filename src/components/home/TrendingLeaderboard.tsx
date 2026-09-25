import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { useLeaderboardVolume } from '@/hooks/useLeaderboardVolume';
import { normalizeCreatorDisplayName } from '@/utils/creatorDisplayName.utils';
import { formatNumber, formatPercent } from '@/utils/numberFormat.utils';
import CreatorInitialsAvatar from '@/components/common/CreatorInitialsAvatar';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Skeleton                                                          */
/* ------------------------------------------------------------------ */

const skeletonBlockClass =
	'rounded-md bg-white/12 skeleton-shimmer motion-reduce:bg-white/18 motion-reduce:ring-1 motion-reduce:ring-white/15';

function LeaderboardSkeletonRow() {
	return (
		<div className="flex items-center gap-4 border-b border-gray-100 px-4 py-3 last:border-b-0">
			<div className={cn('h-5 w-6 shrink-0', skeletonBlockClass)} />
			<div className={cn('size-8 shrink-0 rounded-full', skeletonBlockClass)} />
			<div className="min-w-0 flex-1 space-y-1.5">
				<div className={cn('h-4 w-32', skeletonBlockClass)} />
			</div>
			<div className={cn('h-4 w-16', skeletonBlockClass)} />
			<div className={cn('h-4 w-14', skeletonBlockClass)} />
		</div>
	);
}

function LeaderboardSkeletonList() {
	return (
		<div
			role="status"
			aria-label="Loading leaderboard"
			className="divide-y divide-gray-100"
		>
			<span className="sr-only">Loading leaderboard</span>
			{Array.from({ length: 20 }).map((_, i) => (
				<LeaderboardSkeletonRow key={i} />
			))}
		</div>
	);
}

/* ------------------------------------------------------------------ */
/*  Row                                                               */
/* ------------------------------------------------------------------ */

interface LeaderboardRowProps {
	rank: number;
	name: string;
	thumbnail?: string;
	creatorId: string;
	volume: number;
	change24h: number;
}

function LeaderboardRow({
	rank,
	name,
	thumbnail,
	creatorId,
	volume,
	change24h,
}: LeaderboardRowProps) {
	const changeColor =
		change24h > 0
			? 'text-emerald-600'
			: change24h < 0
				? 'text-red-500'
				: 'text-gray-500';

	return (
		<Link
			to={`/creator/${creatorId}`}
			className="flex items-center gap-4 border-b border-gray-100 px-4 py-3 transition-colors hover:bg-gray-50 last:border-b-0"
		>
			{/* Rank */}
			<span className="w-6 shrink-0 text-right font-mono text-xs tabular-nums text-gray-400">
				{rank}
			</span>

			{/* Avatar */}
			<div className="size-8 shrink-0 overflow-hidden rounded-full bg-gray-100">
				<CreatorInitialsAvatar
					name={name}
					creatorId={creatorId}
					imageSrc={thumbnail}
				/>
			</div>

			{/* Name */}
			<span className="min-w-0 flex-1 truncate font-jakarta text-sm font-medium text-gray-900">
				{name}
			</span>

			{/* Volume */}
			<span className="hidden shrink-0 font-mono text-xs tabular-nums text-gray-500 sm:block">
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
/*  Section                                                           */
/* ------------------------------------------------------------------ */

export default function TrendingLeaderboard() {
	const headingRef = useRef<HTMLDivElement>(null);
	const listRef = useRef<HTMLDivElement>(null);

	const { data: entries, isLoading } = useLeaderboardVolume();

	useEffect(() => {
		const observer = new IntersectionObserver(
			entries => {
				entries.forEach(entry => {
					if (entry.isIntersecting) {
						entry.target.classList.add('is-visible');
						observer.unobserve(entry.target);
					}
				});
			},
			{ threshold: 0.1 }
		);

		if (headingRef.current) observer.observe(headingRef.current);
		if (listRef.current) observer.observe(listRef.current);

		return () => observer.disconnect();
	}, []);

	if (!isLoading && (!entries || entries.length === 0)) {
		return null;
	}

	return (
		<section className="bg-gradient-to-b from-gray-50/50 to-white px-6 py-20">
			<div className="mx-auto max-w-5xl">
				{/* Header */}
				<div ref={headingRef} className="scroll-reveal">
					<div className="flex items-center gap-2">
						<span className="size-1.5 rounded-full bg-amber-400" />
						<span className="font-jakarta text-sm font-medium text-amber-600">
							Trending by volume
						</span>
					</div>

					<div className="mt-3 flex items-end justify-between gap-6">
						<h2 className="font-pt-serif text-[clamp(1.6rem,3.5vw,2.4rem)] font-normal leading-[1.15]">
							<span className="text-gray-900">
								Top creator keys
							</span>
							<br />
							<span className="text-gray-400">
								discover what the market is trading.
							</span>
						</h2>
						<Link
							to="/leaderboard"
							className="mb-1 hidden shrink-0 items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-gray-400 transition-colors hover:text-gray-900 md:flex"
						>
							View all
							<ArrowRight className="size-3.5" />
						</Link>
					</div>
				</div>

				{/* List or Skeleton */}
				{isLoading ? (
					<div className="mt-8 overflow-hidden rounded-2xl border border-gray-100 bg-white">
						<LeaderboardSkeletonList />
					</div>
				) : (
					<div
						ref={listRef}
						className="scroll-reveal mt-8 overflow-hidden rounded-2xl border border-gray-100 bg-white"
						style={{ animationDelay: '100ms' }}
					>
						{entries?.slice(0, 20).map(entry => (
							<LeaderboardRow
								key={entry.id}
								rank={entry.rank}
								name={normalizeCreatorDisplayName(entry.title) || 'Unnamed creator'}
								thumbnail={entry.thumbnail}
								creatorId={entry.id}
								volume={entry.totalVolume}
								change24h={entry.change24h}
							/>
						))}
					</div>
				)}

				{/* Mobile View all link */}
				<div className="mt-4 flex justify-center md:hidden">
					<Link
						to="/leaderboard"
						className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-gray-400 transition-colors hover:text-gray-900"
					>
						View all
						<ArrowRight className="size-3.5" />
					</Link>
				</div>
			</div>
		</section>
	);
}
