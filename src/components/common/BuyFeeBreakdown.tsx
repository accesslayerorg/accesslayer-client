/**
 * Buy fee breakdown display component.
 * Shows gross cost, protocol fee, creator fee, and total before purchase confirmation.
 */

import React from 'react';
import { AlertCircle, HelpCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import { formatDisplayKeyPrice } from '@/utils/keyPriceDisplay.utils';
import type { FeeBreakdown } from '@/utils/pricePreview.utils';

export interface BuyFeeBreakdownProps {
	/** Fee breakdown data from price preview */
	breakdown: FeeBreakdown | null;
	/** Is the preview currently loading? */
	isLoading: boolean;
	/** Error message if preview failed */
	error: string | null;
	/** Callback when user clicks retry button */
	onRetry: () => void;
}

/**
 * Displays a detailed fee breakdown for a buy transaction.
 * Renders base price, protocol fee (%), creator royalty (%), and total cost.
 * Shows loading and error states with inline retry capability.
 */
const BuyFeeBreakdown: React.FC<BuyFeeBreakdownProps> = ({
	breakdown,
	isLoading,
	error,
	onRetry,
}) => {
	if (error) {
		return (
			<div
				className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/5 p-3"
				role="alert"
				data-testid="buy-fee-breakdown-error"
			>
				<AlertCircle className="h-4 w-4 flex-shrink-0 text-red-400 mt-0.5" />
				<div className="flex-1 min-w-0">
					<p className="text-xs text-red-300 mb-2">{error}</p>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={onRetry}
						className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 p-1 h-auto"
						data-testid="buy-fee-breakdown-retry"
					>
						<RotateCcw className="h-3 w-3 mr-1" />
						Retry
					</Button>
				</div>
			</div>
		);
	}

	if (isLoading) {
		return (
			<div
				className="space-y-2"
				role="status"
				aria-live="polite"
				data-testid="buy-fee-breakdown-loading"
			>
				<div className="flex justify-between items-center">
					<span className="text-xs text-white/60">Calculating fees…</span>
					<span className="h-3 w-16 bg-white/10 rounded animate-pulse" />
				</div>
				<div className="flex justify-between items-center">
					<span className="text-xs text-white/60">Protocol fee</span>
					<span className="h-3 w-12 bg-white/10 rounded animate-pulse" />
				</div>
			</div>
		);
	}

	if (!breakdown) {
		return null;
	}

	const protocolFeePercentage = (breakdown.protocolFeeBps / 100).toFixed(2);
	const creatorFeePercentage = (breakdown.creatorFeeBps / 100).toFixed(2);

	return (
		<div
			className="space-y-2 rounded-lg border border-white/10 bg-white/[0.02] p-3"
			data-testid="buy-fee-breakdown"
		>
			{/* Base Price row */}
			<div
				className="flex justify-between items-center text-xs"
				data-testid="buy-fee-breakdown-gross"
			>
				<span className="text-white/70">Base Price</span>
				<span className="font-mono text-white/90">
					{formatDisplayKeyPrice(breakdown.grossCostStroops)}
				</span>
			</div>

			{/* Protocol fee row */}
			{breakdown.protocolFeeBps > 0 && (
				<div
					className="flex justify-between items-center text-xs"
					data-testid="buy-fee-breakdown-protocol"
				>
					<span className="text-white/70 flex items-center gap-1">
						<span>Protocol Fee ({protocolFeePercentage}%)</span>
						<Tooltip content="Protocol fees fund platform maintenance, network operations, and ecosystem development.">
							<span
								className="inline-flex cursor-help text-white/50 hover:text-white/80"
								data-testid="protocol-fee-tooltip"
								aria-label="Protocol Fee info"
							>
								<HelpCircle className="h-3 w-3" />
							</span>
						</Tooltip>
					</span>
					<span className="font-mono text-white/90">
						{formatDisplayKeyPrice(breakdown.protocolFeeStroops)}
					</span>
				</div>
			)}

			{/* Creator Royalty row */}
			{breakdown.creatorFeeBps > 0 && (
				<div
					className="flex justify-between items-center text-xs"
					data-testid="buy-fee-breakdown-creator"
				>
					<span className="text-white/70">
						Creator Royalty ({creatorFeePercentage}%)
					</span>
					<span className="font-mono text-white/90">
						{formatDisplayKeyPrice(breakdown.creatorFeeStroops)}
					</span>
				</div>
			)}

			{/* Total row */}
			<div
				className="flex justify-between items-center text-xs pt-2 border-t border-white/10"
				data-testid="buy-fee-breakdown-total"
			>
				<span className="font-semibold text-white">Total</span>
				<span className="font-mono font-semibold text-amber-300/90">
					{formatDisplayKeyPrice(breakdown.totalCostStroops)}
				</span>
			</div>
		</div>
	);
};

export default BuyFeeBreakdown;
