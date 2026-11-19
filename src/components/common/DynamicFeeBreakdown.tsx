/**
 * Dynamic fee breakdown display for the trade confirmation screen (#994).
 *
 * Renders the four fee components from the contract's dynamic rate — base
 * fee, volume-tier discount, protocol fee, and creator royalty — plus the
 * highlighted effective rate and the total fee in both key units (XLM) and
 * its USD equivalent. Every component label carries a tooltip explaining it.
 */

import React from 'react';
import { HelpCircle, Percent, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import Skeleton from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatDisplayKeyPrice } from '@/utils/keyPriceDisplay.utils';
import { bpsToPercent } from '@/utils/numberFormat.utils';
import type {
	DynamicFeeBreakdown as DynamicFeeBreakdownData,
} from '@/utils/dynamicFeeRate.utils';

export interface DynamicFeeBreakdownProps {
	/** Fee quote computed from the contract's dynamic rate. */
	breakdown: DynamicFeeBreakdownData | null;
	/** True while the contract rate is being fetched. */
	isLoading: boolean;
	/** Error message when the contract rate could not be fetched. */
	error: string | null;
	/** Retry callback for the error state. */
	onRetry: () => void;
}

/** Explanation copy surfaced by each component tooltip. */
export const FEE_COMPONENT_EXPLANATIONS = {
	baseFee:
		'Base fee percentage applied to every trade before any discounts. It funds the bonding-curve liquidity pool.',
	volumeTierDiscount:
		'Discount earned by trading larger amounts. It is subtracted from the base fee and shown as a credit back to you.',
	protocolFee:
		'Protocol fee that funds platform maintenance, network operations, and ecosystem development.',
	creatorRoyalty:
		'Royalty paid to the creator on every trade. Creators set this rate when they deploy their key.',
	effectiveRate:
		'Effective fee rate after the volume-tier discount: base fee − discount + protocol fee + creator royalty.',
} as const;

const DynamicFeeBreakdown: React.FC<DynamicFeeBreakdownProps> = ({
	breakdown,
	isLoading,
	error,
	onRetry,
}) => {
	if (error) {
		return (
			<div
				className="rounded-xl border border-red-500/30 bg-red-500/5 p-3"
				role="alert"
				data-testid="dynamic-fee-breakdown-error"
			>
				<p className="text-xs text-red-300">
					Couldn't load the current fee rate from the contract. {error}
				</p>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={onRetry}
					className="mt-1 h-auto p-1 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300"
					data-testid="dynamic-fee-breakdown-retry"
				>
					<RefreshCw className="mr-1 h-3 w-3" />
					Retry
				</Button>
			</div>
		);
	}

	if (isLoading || !breakdown) {
		return (
			<div
				className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-4"
				role="status"
				aria-live="polite"
				data-testid="dynamic-fee-breakdown-loading"
			>
				<div className="flex items-center justify-between">
					<span className="text-xs text-white/60">Fetching fee rate…</span>
					<Skeleton className="h-3 w-16 bg-white/10" />
				</div>
				<div className="flex items-center justify-between">
					<span className="text-xs text-white/60">Protocol fee</span>
					<Skeleton className="h-3 w-12 bg-white/10" />
				</div>
			</div>
		);
	}

	const showDiscount = breakdown.volumeTierDiscountStroops > 0;

	const rows: Array<{
		id: string;
		label: string;
		explanation: string;
		amount: string;
		isCredit?: boolean;
	}> = [
		{
			id: 'base-fee',
			label: 'Base Fee',
			explanation: FEE_COMPONENT_EXPLANATIONS.baseFee,
			amount: formatDisplayKeyPrice(breakdown.baseFeeStroops),
		},
		...(showDiscount
			? [
					{
						id: 'volume-tier-discount',
						label: 'Volume Tier Discount',
						explanation: FEE_COMPONENT_EXPLANATIONS.volumeTierDiscount,
						amount: `-${formatDisplayKeyPrice(
							breakdown.volumeTierDiscountStroops
						)}`,
						isCredit: true,
					},
				]
			: []),
		{
			id: 'protocol-fee',
			label: 'Protocol Fee',
			explanation: FEE_COMPONENT_EXPLANATIONS.protocolFee,
			amount: formatDisplayKeyPrice(breakdown.protocolFeeStroops),
		},
		{
			id: 'creator-royalty',
			label: 'Creator Royalty',
			explanation: FEE_COMPONENT_EXPLANATIONS.creatorRoyalty,
			amount: formatDisplayKeyPrice(breakdown.creatorRoyaltyStroops),
		},
	];

	return (
		<div
			className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-2.5"
			data-testid="dynamic-fee-breakdown"
		>
			<div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/70">
				<Percent className="h-3.5 w-3.5 text-amber-400" />
				<span>Fee Breakdown</span>
			</div>

			{rows.map(row => (
				<div
					key={row.id}
					className="flex items-center justify-between text-xs"
					data-testid={`fee-breakdown-${row.id}`}
				>
					<span className="flex items-center gap-1 text-white/60">
						<span>{row.label}</span>
						<Tooltip content={row.explanation}>
							<span
								className="inline-flex cursor-help text-white/50 hover:text-white/80"
								data-testid={`fee-breakdown-${row.id}-tooltip`}
								aria-label={`${row.label} info`}
							>
								<HelpCircle className="h-3 w-3" />
							</span>
						</Tooltip>
					</span>
					<span
						className={cn(
							'font-mono tabular-nums',
							row.isCredit ? 'text-emerald-400' : 'text-white/90'
						)}
					>
						{row.amount}
					</span>
				</div>
			))}

			{/* Effective rate + totals */}
			<div
				className="flex items-center justify-between border-t border-white/10 pt-2 text-xs"
				data-testid="fee-breakdown-effective-rate"
			>
				<span className="flex items-center gap-1 text-white/70">
					<span>Effective Rate</span>
					<Tooltip content={FEE_COMPONENT_EXPLANATIONS.effectiveRate}>
						<span
							className="inline-flex cursor-help text-white/50 hover:text-white/80"
							data-testid="fee-breakdown-effective-rate-tooltip"
							aria-label="Effective rate info"
						>
							<HelpCircle className="h-3 w-3" />
						</span>
					</Tooltip>
				</span>
				<span
					className="rounded-md bg-amber-400/10 px-2 py-0.5 font-mono font-bold text-amber-300"
					data-testid="fee-breakdown-effective-rate-value"
				>
					{bpsToPercent(breakdown.effectiveFeeBps)}
				</span>
			</div>

			<div
				className="flex items-center justify-between text-sm"
				data-testid="fee-breakdown-total"
			>
				<span className="font-medium text-white">Total Fee</span>
				<span className="text-right">
					<span
						className="block font-mono font-bold text-amber-300"
						data-testid="fee-breakdown-total-key"
					>
						{formatDisplayKeyPrice(breakdown.totalFeeStroops)}
					</span>
					{breakdown.totalFeeUsd != null && (
						<span
							className="block text-[11px] text-white/50"
							data-testid="fee-breakdown-total-usd"
						>
							≈ ${breakdown.totalFeeUsd.toFixed(2)} USD
						</span>
					)}
				</span>
			</div>

			{breakdown.isSell && breakdown.netProceedsStroops != null && (
				<div
					className="flex items-center justify-between border-t border-white/10 pt-2 text-xs"
					data-testid="fee-breakdown-net-proceeds"
				>
					<span className="text-white/70">Net Proceeds</span>
					<span className="font-mono font-semibold text-white/90 tabular-nums">
						{formatDisplayKeyPrice(breakdown.netProceedsStroops)}
					</span>
				</div>
			)}
		</div>
	);
};

export default DynamicFeeBreakdown;
