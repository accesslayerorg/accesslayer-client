import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
	formatPriceImpact,
	isHighPriceImpact,
	PRICE_IMPACT_THRESHOLD_PERCENT,
} from '@/utils/priceImpact.utils';

export interface PriceImpactWarningProps {
	/** Price impact in percent (e.g. 6.2 for 6.2%). */
	impactPercent: number | null | undefined;
	/** Threshold percentage to trigger the warning (defaults to 5%). */
	threshold?: number;
	className?: string;
}

/**
 * Price impact warning banner shown on the buy/sell panel and confirmation modal
 * when the price impact of a trade exceeds the safety threshold (default 5%) (#919).
 */
export const PriceImpactWarning: React.FC<PriceImpactWarningProps> = ({
	impactPercent,
	threshold = PRICE_IMPACT_THRESHOLD_PERCENT,
	className,
}) => {
	if (!isHighPriceImpact(impactPercent, threshold)) {
		return null;
	}

	const isVeryHigh = Math.abs(impactPercent ?? 0) >= 15;

	return (
		<div
			role="alert"
			data-testid="price-impact-warning"
			className={cn(
				'flex items-start gap-2.5 rounded-xl border p-3 text-xs transition-colors',
				isVeryHigh
					? 'border-red-500/40 bg-red-500/10 text-red-200'
					: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
				className
			)}
		>
			<AlertTriangle
				className={cn(
					'h-4 w-4 shrink-0 mt-0.5',
					isVeryHigh ? 'text-red-400' : 'text-amber-400'
				)}
				aria-hidden="true"
			/>
			<div className="space-y-0.5">
				<p className="font-semibold">
					High Price Impact Warning:{' '}
					<span
						className="font-mono font-bold"
						data-testid="price-impact-value"
					>
						{impactPercent != null
							? formatPriceImpact(impactPercent)
							: ''}
					</span>
				</p>
				<p className="text-white/70">
					This trade has a price impact exceeding {threshold}%. Your order
					will execute at a significantly different price from the current
					spot price.
				</p>
			</div>
		</div>
	);
};

export default PriceImpactWarning;
