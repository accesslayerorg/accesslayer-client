import React from 'react';
import { Tooltip } from '@/components/ui/tooltip';
import Skeleton from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatPercent } from '@/utils/numberFormat.utils';
import { formatDisplayKeyPrice } from '@/utils/keyPriceDisplay.utils';
import {
	calculateKeySpread,
	hasSpreadDisplay,
	type KeySpreadInput,
} from '@/utils/spread.utils';

export const SPREAD_TOOLTIP =
	'The spread is the gap between the current buy (ask) and sell (bid) price. It is the cost of an immediate round-trip trade: buy a key and sell it right back, and you lose roughly this amount. A wider spread means a higher cost to trade.';

export interface SpreadIndicatorProps extends KeySpreadInput {
	/** Render a placeholder while the key config is loading. */
	isLoading?: boolean;
	className?: string;
}

/**
 * Displays the bid-ask spread between the current buy and sell price (#951).
 *
 * Shows the spread amount and percentage with a tooltip explaining what it
 * means. A zero spread renders the buy/sell prices as equal and omits the
 * spread row entirely; an unknown config renders nothing.
 */
export const SpreadIndicator: React.FC<SpreadIndicatorProps> = ({
	buyPriceStroops,
	sellPriceStroops,
	spreadStroops,
	spreadBps,
	isLoading = false,
	className,
}) => {
	if (isLoading) {
		return (
			<div
				className={cn('px-1', className)}
				data-testid="key-spread-loading"
			>
				<Skeleton className="h-3 w-40" />
			</div>
		);
	}

	const spread = calculateKeySpread({
		buyPriceStroops,
		sellPriceStroops,
		spreadStroops,
		spreadBps,
	});

	if (!hasSpreadDisplay(spread)) return null;

	return (
		<div
			className={cn('space-y-1 text-xs', className)}
			data-testid="key-spread"
		>
			{spread.hasPricePair && (
				<div
					className="flex items-center justify-between gap-2 text-white/60"
					data-testid="key-spread-prices"
				>
					<span>
						Buy{' '}
						<span
							className="font-mono font-semibold text-white/90"
							data-testid="key-spread-buy-price"
						>
							{formatDisplayKeyPrice(spread.buyPriceStroops)}
						</span>
					</span>
					<span>
						Sell{' '}
						<span
							className="font-mono font-semibold text-white/90"
							data-testid="key-spread-sell-price"
						>
							{formatDisplayKeyPrice(spread.sellPriceStroops)}
						</span>
					</span>
				</div>
			)}

			{spread.hasSpread && (
				<div
					className="flex items-center justify-between gap-2 text-white/60"
					data-testid="key-spread-row"
				>
					<span className="flex items-center gap-1">
						Spread
						<Tooltip content={SPREAD_TOOLTIP}>
							<button
								type="button"
								aria-label="What is the spread?"
								className="text-white/50 transition-colors hover:text-white/80"
							>
								ⓘ
							</button>
						</Tooltip>
					</span>
					<span className="font-mono font-semibold text-white/90">
						<span data-testid="key-spread-amount">
							{formatDisplayKeyPrice(spread.spreadStroops)}
						</span>
						{spread.spreadPercent != null && (
							<span
								className="ml-1 font-normal text-white/50"
								data-testid="key-spread-percent"
							>
								({formatPercent(spread.spreadPercent)})
							</span>
						)}
					</span>
				</div>
			)}
		</div>
	);
};

export default SpreadIndicator;
