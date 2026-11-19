import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/utils/numberFormat.utils';
import type { LiquidityDepthStatus } from '@/utils/liquidityDepth.utils';

export interface LiquidityDepthIndicatorProps {
	/** Max keys buyable within the user's slippage tolerance. */
	maxDepth: number;
	/** Slippage tolerance in percent, used in the copy. */
	slippageTolerancePercent: number;
	status: LiquidityDepthStatus;
	className?: string;
}

const TOOLTIP_COPY =
	'Liquidity depth is the most keys you can buy in one trade before the price moves more than your slippage tolerance. Buy fewer keys, split the order into several trades, or raise your slippage tolerance to buy more.';

/**
 * Shows the max purchasable amount for the current slippage setting under the
 * buy amount input, and warns as the entered amount nears or passes it (#1108).
 */
export const LiquidityDepthIndicator: React.FC<
	LiquidityDepthIndicatorProps
> = ({ maxDepth, slippageTolerancePercent, status, className }) => {
	const noDepth = maxDepth <= 0;

	return (
		<div
			className={cn('space-y-1.5', className)}
			data-testid="liquidity-depth"
		>
			<div className="flex items-center gap-1.5 text-xs text-white/40">
				<span data-testid="liquidity-depth-max">
					Max buy at {slippageTolerancePercent}% slippage:{' '}
					<span className="font-semibold text-white/60 tabular-nums">
						{formatNumber(maxDepth)} key{maxDepth !== 1 ? 's' : ''}
					</span>
				</span>
				<Tooltip content={TOOLTIP_COPY}>
					<button
						type="button"
						aria-label="What is liquidity depth?"
						className="rounded-full text-white/40 hover:text-white/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
					>
						<Info className="h-3.5 w-3.5" aria-hidden="true" />
					</button>
				</Tooltip>
			</div>

			{status !== 'ok' && (
				<div
					role={status === 'exceeded' ? 'alert' : 'status'}
					data-testid="liquidity-depth-warning"
					data-status={status}
					className={cn(
						'flex items-start gap-2 rounded-lg border p-2 text-xs',
						status === 'exceeded'
							? 'border-red-500/40 bg-red-500/10 text-red-200'
							: 'border-amber-500/40 bg-amber-500/10 text-amber-200'
					)}
				>
					<AlertTriangle
						className="mt-0.5 h-3.5 w-3.5 shrink-0"
						aria-hidden="true"
					/>
					<span>
						{status === 'exceeded'
							? noDepth
								? 'Even 1 key would move the price past your slippage tolerance. Raise your slippage tolerance to buy.'
								: `This amount is above the ${formatNumber(maxDepth)}-key liquidity depth for your slippage tolerance. Lower the amount or raise your tolerance.`
							: `You are close to the ${formatNumber(maxDepth)}-key liquidity depth. Larger orders may be rejected for slippage.`}
					</span>
				</div>
			)}
		</div>
	);
};

export default LiquidityDepthIndicator;
