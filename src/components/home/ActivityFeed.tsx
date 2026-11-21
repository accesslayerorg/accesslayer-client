import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { useRecentActivity } from '@/hooks/useRecentActivity';
import { formatRelativeTime } from '@/utils/time.utils';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Skeleton                                                          */
/* ------------------------------------------------------------------ */

const skeletonBlockClass =
	'rounded-md bg-white/12 skeleton-shimmer motion-reduce:bg-white/18 motion-reduce:ring-1 motion-reduce:ring-white/15';

function ActivitySkeletonRow() {
	return (
		<div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0">
			<div className={cn('h-4 w-24', skeletonBlockClass)} />
			<div className={cn('h-4 w-12', skeletonBlockClass)} />
			<div className="min-w-0 flex-1">
				<div className={cn('h-4 w-32', skeletonBlockClass)} />
			</div>
			<div className={cn('h-4 w-16', skeletonBlockClass)} />
			<div className={cn('h-4 w-20', skeletonBlockClass)} />
		</div>
	);
}

function ActivitySkeletonList() {
	return (
		<div
			role="status"
			aria-label="Loading recent activity"
			className="divide-y divide-gray-100"
		>
			<span className="sr-only">Loading recent activity</span>
			{Array.from({ length: 3 }).map((_, i) => (
				<ActivitySkeletonRow key={i} />
			))}
		</div>
	);
}

/* ------------------------------------------------------------------ */
/*  Row                                                               */
/* ------------------------------------------------------------------ */

interface ActivityRowProps {
	walletAddress: string;
	type: 'buy' | 'sell';
	creatorName: string;
	creatorId: string;
	quantity: number;
	timestamp: number;
}

function ActivityRow({
	walletAddress,
	type,
	creatorName,
	creatorId,
	quantity,
	timestamp,
}: ActivityRowProps) {
	const truncatedWallet = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
	const actionLabel = type === 'buy' ? 'Bought' : 'Sold';
	const actionColor =
		type === 'buy'
			? 'text-emerald-600'
			: 'text-red-500';
	const timeAgo = formatRelativeTime(timestamp);

	return (
		<div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0">
			{/* Wallet */}
			<span className="shrink-0 font-mono text-xs text-gray-500">
				{truncatedWallet}
			</span>

			{/* Action */}
			<span className={cn('shrink-0 font-mono text-xs font-medium', actionColor)}>
				{actionLabel}
			</span>

			{/* Creator Name */}
			<Link
				to={`/creator/${creatorId}`}
				className="min-w-0 flex-1 truncate font-jakarta text-sm font-medium text-blue-600 transition-colors hover:text-blue-700"
			>
				{creatorName}
			</Link>

			{/* Quantity */}
			<span className="shrink-0 font-mono text-xs tabular-nums text-gray-600">
				{quantity}
			</span>

			{/* Time */}
			<span className="shrink-0 font-mono text-xs text-gray-400">
				{timeAgo}
			</span>
		</div>
	);
}

/* ------------------------------------------------------------------ */
/*  Section                                                           */
/* ------------------------------------------------------------------ */

export default function ActivityFeed() {
	const headingRef = useRef<HTMLDivElement>(null);
	const listRef = useRef<HTMLDivElement>(null);

	const { trades, isLoading } = useRecentActivity();

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

	if (!isLoading && (!trades || trades.length === 0)) {
		return null;
	}

	return (
		<section className="bg-white px-6 py-20">
			<div className="mx-auto max-w-5xl">
				{/* Header */}
				<div ref={headingRef} className="scroll-reveal">
					<div className="flex items-center gap-2">
						<span className="size-1.5 rounded-full bg-blue-400 animate-pulse" />
						<span className="font-jakarta text-sm font-medium text-blue-600">
							Live Activity
						</span>
					</div>

					<h2 className="mt-3 font-pt-serif text-[clamp(1.6rem,3.5vw,2.4rem)] font-normal leading-[1.15]">
						<span className="text-gray-900">
							Recent marketplace
						</span>
						<br />
						<span className="text-gray-400">
							activity across all creators.
						</span>
					</h2>
				</div>

				{/* List or Skeleton */}
				{isLoading ? (
					<div className="mt-8 overflow-hidden rounded-2xl border border-gray-100 bg-white">
						<ActivitySkeletonList />
					</div>
				) : (
					<div
						ref={listRef}
						className="scroll-reveal mt-8 overflow-hidden rounded-2xl border border-gray-100 bg-white"
						style={{ animationDelay: '100ms' }}
					>
						{trades?.map(trade => (
							<ActivityRow
								key={trade.id}
								walletAddress={trade.walletAddress}
								type={trade.type}
								creatorName={trade.creatorName}
								creatorId={trade.creatorId}
								quantity={trade.quantity}
								timestamp={trade.timestamp}
							/>
						))}
					</div>
				)}
			</div>
		</section>
	);
}
