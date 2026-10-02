import React from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';
import Skeleton from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatPercent } from '@/utils/numberFormat.utils';
import { formatDisplayKeyPrice } from '@/utils/keyPriceDisplay.utils';
import { formatStaleAge } from '@/utils/staleData.utils';
import {
	DEFAULT_ORACLE_DEVIATION_THRESHOLD_BPS,
	type OracleComparison,
	type OracleFreshness,
} from '@/utils/oraclePrice.utils';

export interface OraclePriceIndicatorProps {
	/** Oracle-vs-spot comparison resolved by `useKeyOraclePrice`. */
	comparison: OracleComparison;
	/** Freshness of the oracle feed. */
	freshness: OracleFreshness;
	/** Feed identifier rendered in the tooltip. */
	source?: string | null;
	/** Threshold in basis points, mentioned in the warning copy. */
	thresholdBps?: number;
	/** Render a placeholder while the oracle price is loading. */
	isLoading?: boolean;
	className?: string;
}

const buildTooltip = (source?: string | null): string => {
	const origin = source
		? `Published by the ${source} oracle feed.`
		: 'Published by an independent external oracle feed.';

	return `${origin} This is a reference price for the key's value, shown next to the bonding-curve spot price so you can spot a divergence before trading. If the two drift apart by too much, the curve price may be out of line with the wider market.`;
};

/**
 * Oracle price display for the key trading panel (#967).
 *
 * Shows the oracle price alongside the spot price, the percentage deviation
 * between them, a warning indicator once the deviation crosses the configured
 * threshold, and a staleness indicator when the feed has not published
 * recently. Renders nothing when no oracle price is available.
 */
export const OraclePriceIndicator: React.FC<OraclePriceIndicatorProps> = ({
	comparison,
	freshness,
	source,
	thresholdBps = DEFAULT_ORACLE_DEVIATION_THRESHOLD_BPS,
	isLoading = false,
	className,
}) => {
	if (isLoading) {
		return (
			<div
				className={cn('px-1', className)}
				data-testid="oracle-price-loading"
			>
				<Skeleton className="h-3 w-40" />
			</div>
		);
	}

	// Nothing to compare against — an absent oracle feed is a normal state, so
	// the trading panel simply omits the row instead of showing a placeholder.
	if (comparison.oraclePriceStroops == null) return null;

	const isWarning = comparison.exceedsThreshold;
	const isStale = freshness.isStale;
	const thresholdPercent = thresholdBps / 100;

	return (
		<div
			className={cn('space-y-1 text-xs', className)}
			data-testid="oracle-price-indicator"
		>
			<div
				className="flex items-center justify-between gap-2 text-white/60"
				data-testid="oracle-price-row"
			>
				<span className="flex items-center gap-1">
					Oracle price
					<Tooltip content={buildTooltip(source)}>
						<button
							type="button"
							aria-label="What is the oracle price?"
							className="text-white/50 transition-colors hover:text-white/80"
							data-testid="oracle-price-tooltip-trigger"
						>
							<HelpCircle className="size-3.5" aria-hidden="true" />
						</button>
					</Tooltip>
				</span>
				<span className="font-mono font-semibold text-white/90">
					<span data-testid="oracle-price-value">
						{formatDisplayKeyPrice(comparison.oraclePriceStroops)}
					</span>
					{comparison.deviationPercent != null && (
						<span
							className="ml-1 font-normal text-white/50"
							data-testid="oracle-price-deviation"
						>
							({formatPercent(comparison.deviationPercent, {
								maximumFractionDigits: 1,
							})})
						</span>
					)}
				</span>
			</div>

			{isStale && (
				<p
					role="status"
					className="flex items-center gap-1.5 text-amber-300/90"
					data-testid="oracle-price-stale-indicator"
				>
					<AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
					Stale feed · {formatStaleAge(freshness.ageMs)}
				</p>
			)}

			{isWarning && (
				<p
					role="alert"
					className="flex items-center gap-1.5 font-medium text-rose-300"
					data-testid="oracle-price-deviation-warning"
				>
					<AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
					Oracle price is {comparison.direction} the curve price by more
					than {formatPercent(thresholdPercent, {
						maximumFractionDigits: 1,
					})}
				</p>
			)}
		</div>
	);
};

export default OraclePriceIndicator;
