import React from 'react';
import { ShieldCheck, Lock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import AccessibleInfoTrigger from '@/components/common/AccessibleInfoTrigger';
import Skeleton from '@/components/ui/skeleton';
import type { PerformanceBond } from '@/services/course.service';
import { formatNumber } from '@/utils/numberFormat.utils';
import { formatDisplayKeyPrice } from '@/utils/keyPriceDisplay.utils';
import { cn } from '@/lib/utils';

export interface PerformanceBondPanelProps {
	/** Performance bond data for the creator key (#975). */
	bond?: PerformanceBond | null;
	/** Loading state flag while bond data is being fetched. */
	isLoading?: boolean;
	/** Error state flag. */
	isError?: boolean;
	className?: string;
}

const TOOLTIP_EXPLANATION =
	'A performance bond locks creator capital on-chain until maturity milestones are met, guaranteeing creator commitment and protecting investors against project abandonment.';

function formatBondAmount(
	amountStroops?: number | null,
	amountXlm?: number | null
): string {
	if (amountStroops != null && Number.isFinite(amountStroops)) {
		return formatDisplayKeyPrice(amountStroops);
	}
	if (amountXlm != null && Number.isFinite(amountXlm)) {
		return `${formatNumber(amountXlm)} XLM`;
	}
	return '—';
}

function formatReleaseDate(releasedAt?: string | null): string {
	if (!releasedAt) return '—';
	try {
		const date = new Date(releasedAt);
		if (isNaN(date.getTime())) return releasedAt;
		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		});
	} catch {
		return releasedAt;
	}
}

/**
 * Performance bond status panel for the creator key detail page (#975).
 *
 * Displays the bonded amount, current state (staked, released, forfeited),
 * and target maturity milestone required for release. Hidden when no bond exists.
 */
export const PerformanceBondPanel: React.FC<PerformanceBondPanelProps> = ({
	bond,
	isLoading = false,
	isError = false,
	className,
}) => {
	// Panel not rendered when no bond exists and not loading (#975)
	if (!isLoading && !bond) {
		return null;
	}

	if (isLoading && !bond) {
		return (
			<section
				aria-labelledby="performance-bond-heading"
				aria-busy="true"
				className={cn(
					'rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8',
					className
				)}
				data-testid="performance-bond-panel-loading"
			>
				<div className="flex items-center justify-between mb-6">
					<Skeleton className="h-6 w-40" />
					<Skeleton className="h-6 w-24 rounded-full" />
				</div>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<Skeleton className="h-16 w-full rounded-2xl" />
					<Skeleton className="h-16 w-full rounded-2xl" />
				</div>
				<span role="status" className="sr-only">
					Loading performance bond status
				</span>
			</section>
		);
	}

	if (isError && !bond) {
		return null;
	}

	if (!bond) return null;

	const stateLower = (bond.state || '').toLowerCase();
	const isStaked = stateLower === 'staked';
	const isReleased = stateLower === 'released';
	const isForfeited = stateLower === 'forfeited';

	const formattedAmount = formatBondAmount(bond.amountStroops, bond.amountXlm);
	const milestoneText = bond.milestone || bond.targetMilestone || '—';
	const forfeitureReasonText = bond.forfeitureReason || bond.reason || null;
	const releaseDateText = formatReleaseDate(bond.releasedAt);

	return (
		<section
			aria-labelledby="performance-bond-heading"
			className={cn(
				'rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8',
				className
			)}
			data-testid="performance-bond-panel"
		>
			{/* Header with Title, Tooltip, and State Badge */}
			<div className="flex flex-wrap items-center justify-between gap-4 mb-6">
				<div className="flex items-center gap-2">
					<ShieldCheck className="size-5 text-amber-400" aria-hidden="true" />
					<h2
						id="performance-bond-heading"
						className="font-grotesque text-xl font-black tracking-tight text-white"
					>
						Performance Bond
					</h2>
					<AccessibleInfoTrigger
						explanation={TOOLTIP_EXPLANATION}
						label="Explanation for Performance Bond"
					/>
				</div>

				{/* State Badge with distinct visual treatment */}
				<div
					data-testid="performance-bond-state"
					className={cn(
						'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider',
						isStaked &&
							'border-amber-500/30 bg-amber-500/10 text-amber-400',
						isReleased &&
							'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
						isForfeited &&
							'border-rose-500/30 bg-rose-500/10 text-rose-400',
						!isStaked &&
							!isReleased &&
							!isForfeited &&
							'border-white/20 bg-white/10 text-white/80'
					)}
				>
					{isStaked && (
						<>
							<Lock className="size-3.5" aria-hidden="true" />
							<span>Staked</span>
						</>
					)}
					{isReleased && (
						<>
							<CheckCircle2 className="size-3.5" aria-hidden="true" />
							<span>Released</span>
						</>
					)}
					{isForfeited && (
						<>
							<AlertTriangle className="size-3.5" aria-hidden="true" />
							<span>Forfeited</span>
						</>
					)}
					{!isStaked && !isReleased && !isForfeited && (
						<span>{bond.state}</span>
					)}
				</div>
			</div>

			{/* Info Grid: Bonded Amount & Maturity Milestone */}
			<dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div
					className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
					data-testid="performance-bond-amount-card"
				>
					<dt className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-white/40">
						Bonded Amount
					</dt>
					<dd
						className="mt-2 text-lg font-bold text-white tabular-nums"
						data-testid="performance-bond-amount"
					>
						{formattedAmount}
					</dd>
				</div>

				<div
					className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
					data-testid="performance-bond-milestone-card"
				>
					<dt className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-white/40">
						Maturity Milestone
					</dt>
					<dd
						className="mt-2 text-lg font-bold text-white/90"
						data-testid="performance-bond-milestone"
					>
						{milestoneText}
					</dd>
				</div>
			</dl>

			{/* State-specific details */}
			{isReleased && (
				<div
					className="mt-4 flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-300"
					data-testid="performance-bond-released-at"
				>
					<span className="font-semibold">Bond Released</span>
					<span className="font-mono text-emerald-200">
						Released on {releaseDateText}
					</span>
				</div>
			)}

			{isForfeited && (
				<div
					className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-200"
					data-testid="performance-bond-reason"
				>
					<div className="flex items-center gap-2 font-bold text-rose-300 uppercase tracking-wider mb-1">
						<AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
						<span>Bond Forfeited</span>
					</div>
					<p className="mt-1 text-white/80 leading-relaxed font-jakarta">
						{forfeitureReasonText ||
							'The creator failed to reach the required maturity milestone.'}
					</p>
				</div>
			)}
		</section>
	);
};

export default PerformanceBondPanel;
