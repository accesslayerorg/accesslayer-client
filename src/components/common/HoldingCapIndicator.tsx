import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/utils/numberFormat.utils';
import AccessibleInfoTrigger from '@/components/common/AccessibleInfoTrigger';

export interface HoldingCapIndicatorProps {
	/** Current number of keys held by the user for this key. */
	currentHoldings: number;
	/** Maximum holding cap per wallet. null/undefined/<=0 means unlimited. */
	holdingCap?: number | null;
	/** Purchase quantity currently entered in the buy form. */
	purchaseAmount?: number;
	/** Optional creator name for context. */
	creatorName?: string;
	className?: string;
}

/**
 * Holding cap indicator for buy forms (#1015).
 *
 * Displays:
 * - Current balance vs maximum holding cap ratio
 * - Accessible progress bar showing holding utilization
 * - Accessible tooltip explaining the creator-configured holding cap policy
 * - Inline warning when the proposed purchase would breach or has breached the cap
 *
 * Automatically hidden when no holding cap is set or cap is unlimited.
 */
export const HoldingCapIndicator: React.FC<HoldingCapIndicatorProps> = ({
	currentHoldings,
	holdingCap,
	purchaseAmount = 0,
	creatorName,
	className,
}) => {
	// Cap indicator hidden for keys without a holding cap / unlimited cap
	if (
		holdingCap == null ||
		!Number.isFinite(holdingCap) ||
		holdingCap <= 0
	) {
		return null;
	}

	const safeCurrentHoldings = Math.max(0, currentHoldings || 0);
	const safePurchase = Number.isFinite(purchaseAmount) && purchaseAmount > 0 ? purchaseAmount : 0;
	const projectedTotal = safeCurrentHoldings + safePurchase;

	// Ratio based on current balance vs max cap
	const currentRatio = Math.min(1, safeCurrentHoldings / holdingCap);
	const currentPercent = Math.min(100, Math.round(currentRatio * 100));

	const isLimitReached = safeCurrentHoldings >= holdingCap;
	const wouldBreachCap = safePurchase > 0 && projectedTotal > holdingCap;
	const isWarningActive = isLimitReached || wouldBreachCap;

	const remainingAllowance = Math.max(0, holdingCap - safeCurrentHoldings);

	const policyExplanation = creatorName
		? `${creatorName} has set a maximum holding cap of ${formatNumber(holdingCap)} keys per wallet to prevent concentration and encourage wide distribution.`
		: `The creator has set a maximum holding cap of ${formatNumber(holdingCap)} keys per wallet to prevent concentration and encourage wide distribution.`;

	return (
		<div
			data-testid="holding-cap-indicator"
			className={cn(
				'rounded-xl border p-3 transition-colors',
				isWarningActive
					? 'border-amber-500/40 bg-amber-500/5'
					: 'border-white/10 bg-white/[0.03]',
				className
			)}
		>
			{/* Header: Label, Tooltip, and Current / Max Cap text */}
			<div className="flex items-center justify-between text-xs mb-1.5">
				<div className="flex items-center gap-1.5 font-medium text-white/80">
					<span>Holding Cap</span>
					<AccessibleInfoTrigger
						explanation={policyExplanation}
						label="Holding cap policy"
						className="text-white/60 hover:text-white"
					/>
				</div>
				<span
					data-testid="holding-cap-ratio"
					className="font-mono text-white/70 tabular-nums"
					aria-label={`Holding cap: ${formatNumber(safeCurrentHoldings)} of ${formatNumber(holdingCap)} keys`}
				>
					{formatNumber(safeCurrentHoldings)} / {formatNumber(holdingCap)} keys
				</span>
			</div>

			{/* Progress Bar */}
			<div
				role="progressbar"
				aria-valuenow={safeCurrentHoldings}
				aria-valuemin={0}
				aria-valuemax={holdingCap}
				aria-valuetext={`${formatNumber(safeCurrentHoldings)} of ${formatNumber(holdingCap)} keys (${currentPercent}%)`}
				data-testid="holding-cap-progress-bar"
				className="h-2 w-full overflow-hidden rounded-full bg-white/10"
			>
				<div
					className={cn(
						'h-full rounded-full transition-all duration-300',
						isLimitReached
							? 'bg-rose-500'
							: wouldBreachCap
							? 'bg-amber-400'
							: 'bg-amber-400/80'
					)}
					style={{ width: `${currentPercent}%` }}
				/>
			</div>

			{/* Inline warning when purchase amount would breach cap */}
			{isWarningActive && (
				<div
					role="alert"
					data-testid="holding-cap-warning"
					className="mt-2 flex items-start gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-200"
				>
					<AlertTriangle
						className="size-3.5 shrink-0 mt-0.5 text-amber-400"
						aria-hidden="true"
					/>
					<div>
						{isLimitReached ? (
							<span>
								You have reached the maximum holding cap of{' '}
								<strong>{formatNumber(holdingCap)} keys</strong> for this
								creator.
							</span>
						) : (
							<span>
								This purchase ({formatNumber(safePurchase)}) would exceed the
								holding cap of {formatNumber(holdingCap)} keys. You can buy at
								most{' '}
								<strong>
									{formatNumber(remainingAllowance)}{' '}
									{remainingAllowance === 1 ? 'key' : 'keys'}
								</strong>
								.
							</span>
						)}
					</div>
				</div>
			)}
		</div>
	);
};

export default HoldingCapIndicator;
