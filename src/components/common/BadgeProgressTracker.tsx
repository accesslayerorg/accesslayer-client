import { useEffect, useMemo, useRef } from 'react';
import { format, isValid, parseISO } from 'date-fns';
import { CheckCircle2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import Skeleton from '@/components/ui/skeleton';
import {
	useWalletBadgeMetrics,
	useWalletBadges,
	useWalletHoldings,
} from '@/hooks/useWallet';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/utils/numberFormat.utils';
import { computeBadgeProgress } from '@/utils/walletBadges.utils';

interface BadgeProgressTrackerProps {
	wallet: string;
	className?: string;
}

function formatEarnedDate(earnedAt: string): string {
	const date = parseISO(earnedAt);
	return isValid(date) ? format(date, 'MMM d, yyyy') : 'Date unavailable';
}

const GRID_CLASS = 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3';

/**
 * Badge criteria progress tracker for the portfolio page (#1225).
 *
 * Unearned badges show their criteria and a progress bar measured against the
 * wallet's activity metrics; earned badges show a green check and earn date.
 * The section is hidden once every badge has been earned. Progress refreshes
 * on a poll and whenever the wallet's holdings change (a new trade or hold).
 */
export default function BadgeProgressTracker({
	wallet,
	className,
}: BadgeProgressTrackerProps) {
	const badgesQuery = useWalletBadges(wallet);
	const metricsQuery = useWalletBadgeMetrics(wallet);
	const { dataUpdatedAt: holdingsUpdatedAt } = useWalletHoldings(wallet);

	const { refetch: refetchBadges } = badgesQuery;
	const { refetch: refetchMetrics } = metricsQuery;
	const lastHoldingsUpdateRef = useRef(holdingsUpdatedAt);
	useEffect(() => {
		const previous = lastHoldingsUpdateRef.current;
		lastHoldingsUpdateRef.current = holdingsUpdatedAt;
		// Skip the first holdings load; only react to later trade/hold refreshes.
		if (!previous || holdingsUpdatedAt === previous) return;
		void refetchBadges();
		void refetchMetrics();
	}, [holdingsUpdatedAt, refetchBadges, refetchMetrics]);

	const { earned, inProgress } = useMemo(
		() => computeBadgeProgress(badgesQuery.data ?? [], metricsQuery.data),
		[badgesQuery.data, metricsQuery.data]
	);

	const isLoading = badgesQuery.isLoading || metricsQuery.isLoading;
	const isError = badgesQuery.isError || metricsQuery.isError;

	if (!isLoading && !isError && inProgress.length === 0) return null;

	return (
		<section
			data-testid="badge-progress-tracker"
			aria-labelledby="badge-progress-heading"
			className={cn('space-y-3', className)}
		>
			<div>
				<h2
					id="badge-progress-heading"
					className="text-lg font-semibold text-white"
				>
					Badge Progress
				</h2>
				<p className="text-sm text-white/60">
					How close this wallet is to earning each badge.
				</p>
			</div>

			{isLoading ? (
				<div className={GRID_CLASS} data-testid="badge-progress-loading">
					{Array.from({ length: 3 }, (_, index) => (
						<Skeleton key={index} className="h-28 w-full" />
					))}
				</div>
			) : isError ? (
				<div className="flex items-center gap-3 rounded-lg border border-white/10 p-4 text-sm text-white/70">
					<span>Couldn't load badge progress.</span>
					<button
						type="button"
						onClick={() => {
							void refetchBadges();
							void refetchMetrics();
						}}
						className="rounded-md border border-white/20 px-3 py-1 text-white hover:bg-white/10"
					>
						Retry
					</button>
				</div>
			) : (
				<div className={GRID_CLASS}>
					{inProgress.map(badge => {
						const Icon = badge.icon;
						const percent = Math.round(badge.percent);
						return (
							<article
								key={badge.id}
								data-testid={`badge-progress-${badge.id}`}
								className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-4"
							>
								<div className="flex items-center gap-3">
									<Icon className="size-6 shrink-0 text-white/70" aria-hidden="true" />
									<div className="min-w-0">
										<h3 className="text-sm font-medium text-white">
											{badge.name}
										</h3>
										<p className="text-xs text-white/60">{badge.criteria}</p>
									</div>
								</div>
								<div className="space-y-1.5">
									<div className="flex items-center justify-between text-xs text-white/60">
										<span data-testid={`badge-progress-${badge.id}-value`}>
											{formatNumber(badge.current)} / {formatNumber(badge.target)}{' '}
											{badge.unit}
										</span>
										<span className="font-mono tabular-nums">{percent}%</span>
									</div>
									<Progress
										value={percent}
										aria-label={`${badge.name} badge progress`}
										data-testid={`badge-progress-${badge.id}-bar`}
										className="h-1.5 bg-white/10"
									/>
								</div>
							</article>
						);
					})}

					{earned.map(badge => (
						<article
							key={badge.id}
							data-testid={`badge-progress-earned-${badge.id}`}
							className="flex items-center gap-3 rounded-lg border border-emerald-400/20 bg-emerald-400/[0.06] p-4"
						>
							<CheckCircle2
								className="size-6 shrink-0 text-emerald-400"
								aria-label="Earned"
							/>
							<div className="min-w-0">
								<h3 className="text-sm font-medium text-white">{badge.name}</h3>
								<p className="text-xs text-emerald-300/80">
									Earned {formatEarnedDate(badge.earnedAt)}
								</p>
							</div>
						</article>
					))}
				</div>
			)}
		</section>
	);
}
