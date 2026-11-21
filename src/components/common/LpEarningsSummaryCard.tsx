import React from 'react';
import { Sprout } from 'lucide-react';
import {
	formatLpAmount,
	type LpEarningsSummary,
} from '@/utils/lpPositions.utils';
import { cn } from '@/lib/utils';

export interface LpEarningsSummaryCardProps {
	summary: LpEarningsSummary;
	isLoading?: boolean;
	className?: string;
}

/**
 * Total LP earnings across every active liquidity position (#1030).
 *
 * Total = unclaimed rewards + rewards already claimed from those positions,
 * all in XLM (see `summarizeLpEarnings`). When any position's rewards can't
 * be read, the total is shown as unavailable instead of an understated sum.
 */
const LpEarningsSummaryCard: React.FC<LpEarningsSummaryCardProps> = ({
	summary,
	isLoading = false,
	className,
}) => {
	const totalDisplay = isLoading
		? 'Loading…'
		: summary.totalStroops == null
			? 'Unavailable'
			: formatLpAmount(summary.totalStroops);

	return (
		<section
			aria-label="LP earnings summary"
			data-testid="lp-earnings-summary"
			className={cn(
				'rounded-2xl border border-white/10 bg-white/[0.02] p-5 md:p-6',
				className
			)}
		>
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-start gap-3">
					<div className="rounded-lg bg-emerald-400/10 p-2 text-emerald-300">
						<Sprout className="size-4" aria-hidden="true" />
					</div>
					<div>
						<p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-white/45">
							Total LP earnings
						</p>
						<p
							role="status"
							aria-live="polite"
							aria-busy={isLoading || undefined}
							data-testid="lp-earnings-total"
							className="mt-1 break-all font-grotesque text-2xl font-black text-white"
						>
							{totalDisplay}
						</p>
						{!isLoading && summary.unavailableCount > 0 && (
							<p
								data-testid="lp-earnings-incomplete"
								className="mt-1 text-xs text-amber-300"
							>
								Rewards for {summary.unavailableCount} position
								{summary.unavailableCount === 1 ? '' : 's'} could not be
								loaded, so the total is withheld.
							</p>
						)}
					</div>
				</div>

				<dl className="grid grid-cols-3 gap-4 text-right text-xs sm:min-w-[22rem]">
					<div>
						<dt className="text-white/45">Unclaimed</dt>
						<dd
							data-testid="lp-earnings-unclaimed"
							className="mt-1 break-all font-mono font-semibold text-emerald-300"
						>
							{isLoading
								? '—'
								: formatLpAmount(summary.unclaimedStroops)}
						</dd>
					</div>
					<div>
						<dt className="text-white/45">Claimed</dt>
						<dd
							data-testid="lp-earnings-claimed"
							className="mt-1 break-all font-mono font-semibold text-white/80"
						>
							{isLoading ? '—' : formatLpAmount(summary.claimedStroops)}
						</dd>
					</div>
					<div>
						<dt className="text-white/45">Positions</dt>
						<dd
							data-testid="lp-earnings-count"
							className="mt-1 font-mono font-semibold text-white/80"
						>
							{isLoading ? '—' : summary.positionCount}
						</dd>
					</div>
				</dl>
			</div>
		</section>
	);
};

export default LpEarningsSummaryCard;
