import React, { useMemo, useState } from 'react';
import { Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Skeleton from '@/components/ui/skeleton';
import type { Course } from '@/services/course.service';
import type { HeldKeyPosition } from '@/utils/portfolioValue.utils';
import type { RebalancePreview } from '@/services/rebalance.service';
import {
	useExecuteRebalanceMutation,
	useRebalancePreviewMutation,
} from '@/hooks/useRebalance';
import {
	buildAllocationInputs,
	formatAllocationSum,
	formatSwapDelta,
	isAllocationTotalValid,
	sumTargetAllocations,
} from '@/utils/rebalance.utils';
import { formatDisplayKeyPrice } from '@/utils/keyPriceDisplay.utils';
import { calculatePortfolioValue } from '@/utils/portfolioValue.utils';
import showToast from '@/utils/toast.util';
import { cn } from '@/lib/utils';

export interface PortfolioRebalancePanelProps {
	wallet: string;
	positions: HeldKeyPosition[];
	creators?: Course[];
	className?: string;
}

/**
 * Portfolio rebalance panel (#1139): lets the user configure a target
 * allocation percentage for each held key, validates the total sums to
 * 100%, previews the swaps `get_rebalance_preview` would require, and
 * executes them atomically via `execute_rebalance`.
 */
export const PortfolioRebalancePanel: React.FC<
	PortfolioRebalancePanelProps
> = ({ wallet, positions, creators = [], className }) => {
	const portfolioValue = useMemo(
		() => calculatePortfolioValue(positions),
		[positions]
	);

	const initialAllocations = useMemo(() => {
		const totalStroops = portfolioValue.totalStroops || 1;
		return positions.map(position => {
			const valueStroops =
				(position.quantity ?? 0) * (position.priceStroops ?? 0);
			const currentPercent =
				totalStroops > 0
					? Math.round((valueStroops / totalStroops) * 10000) / 100
					: 0;
			return { keyId: position.creatorId, targetPercent: currentPercent };
		});
	}, [positions, portfolioValue.totalStroops]);

	const [allocations, setAllocations] = useState(initialAllocations);
	const [preview, setPreview] = useState<RebalancePreview | null>(null);

	const previewMutation = useRebalancePreviewMutation(wallet);
	const executeMutation = useExecuteRebalanceMutation(wallet);

	const totalPercent = sumTargetAllocations(allocations);
	const isValidTotal = isAllocationTotalValid(allocations);

	const handlePercentChange = (keyId: string, value: string) => {
		const parsed = Number(value);
		setPreview(null);
		setAllocations(prev =>
			prev.map(row =>
				row.keyId === keyId
					? { ...row, targetPercent: Number.isFinite(parsed) ? parsed : 0 }
					: row
			)
		);
	};

	const handlePreview = async () => {
		const inputs = buildAllocationInputs(allocations);
		try {
			const result = await previewMutation.mutateAsync(inputs);
			setPreview(result);
		} catch {
			// Error toast already shown by the mutation's onError.
		}
	};

	const handleExecute = async () => {
		if (!preview) return;
		const inputs = buildAllocationInputs(allocations);
		try {
			const receipt = await executeMutation.mutateAsync({
				allocations: inputs,
				preview,
			});

			const summary = receipt.swaps
				.filter(swap => swap.deltaQuantity !== 0)
				.map(swap => `${swap.keyTitle ?? swap.keyId}: ${formatSwapDelta(swap.deltaQuantity)}`)
				.join(', ');

			showToast.transactionSuccess(
				'RebalanceExecuted',
				summary || 'Portfolio rebalanced',
				receipt.txHash
			);
			setPreview(null);
		} catch {
			// Error toast already shown by the mutation's onError.
		}
	};

	if (positions.length === 0) {
		return (
			<p
				className={cn('text-sm text-white/60', className)}
				data-testid="rebalance-empty-state"
			>
				You need to hold at least one creator key before you can configure
				a rebalance.
			</p>
		);
	}

	return (
		<div
			className={cn('space-y-6', className)}
			data-testid="portfolio-rebalance-panel-content"
		>
			<div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
				{allocations.map(row => {
					const creator = creators.find(c => c.id === row.keyId);
					const position = positions.find(p => p.creatorId === row.keyId);
					return (
						<div
							key={row.keyId}
							className="flex items-center justify-between gap-4"
							data-testid={`rebalance-row-${row.keyId}`}
						>
							<div className="min-w-0 flex-1">
								<p className="truncate text-sm font-semibold text-white">
									{creator?.title ?? 'Creator key'}
								</p>
								<p className="text-xs text-white/40">
									{position?.quantity ?? 0} keys held
								</p>
							</div>
							<div className="flex items-center gap-1.5">
								<input
									type="number"
									min={0}
									max={100}
									step="0.01"
									value={row.targetPercent}
									onChange={e =>
										handlePercentChange(row.keyId, e.target.value)
									}
									aria-label={`Target allocation for ${creator?.title ?? row.keyId}`}
									data-testid={`rebalance-input-${row.keyId}`}
									className="w-20 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-right text-sm font-mono text-white outline-none focus:border-amber-400/50"
								/>
								<span className="text-sm text-white/50">%</span>
							</div>
						</div>
					);
				})}

				<div
					className={cn(
						'flex items-center justify-between border-t border-white/10 pt-3 text-sm font-semibold',
						isValidTotal ? 'text-emerald-300' : 'text-rose-300'
					)}
					data-testid="rebalance-total"
				>
					<span>Total allocation</span>
					<span>{formatAllocationSum(totalPercent)}</span>
				</div>
				{!isValidTotal && (
					<p
						role="alert"
						className="text-xs text-rose-300"
						data-testid="rebalance-total-error"
					>
						Allocations must sum to 100% before you can preview or
						execute a rebalance.
					</p>
				)}
			</div>

			<div className="flex flex-wrap gap-3">
				<Button
					variant="outline"
					disabled={!isValidTotal || previewMutation.isPending}
					onClick={handlePreview}
					data-testid="rebalance-preview-button"
					className="border-white/10 bg-white/5 text-white hover:bg-white/10"
				>
					{previewMutation.isPending ? 'Previewing…' : 'Preview Rebalance'}
				</Button>
				<Button
					disabled={!isValidTotal || !preview || executeMutation.isPending}
					onClick={handleExecute}
					data-testid="rebalance-execute-button"
				>
					<Scale className="mr-1.5 size-4" />
					{executeMutation.isPending ? 'Executing…' : 'Execute Rebalance'}
				</Button>
			</div>

			{previewMutation.isPending && (
				<div data-testid="rebalance-preview-loading" role="status">
					<Skeleton className="h-24 w-full" />
				</div>
			)}

			{preview && (
				<div
					className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.02] p-5"
					data-testid="rebalance-preview-results"
				>
					<h3 className="font-grotesque text-sm font-bold text-white">
						Required swaps
					</h3>
					{preview.swaps.length === 0 ? (
						<p className="text-sm text-white/50">
							Your portfolio already matches this allocation.
						</p>
					) : (
						<ul className="space-y-1.5">
							{preview.swaps.map(swap => (
								<li
									key={swap.keyId}
									className="flex items-center justify-between text-sm"
									data-testid={`rebalance-swap-${swap.keyId}`}
								>
									<span className="text-white/70">
										{swap.keyTitle ?? swap.keyId}
									</span>
									<span className="font-mono text-white">
										{formatSwapDelta(swap.deltaQuantity)}
									</span>
								</li>
							))}
						</ul>
					)}
					<div className="flex items-center justify-between border-t border-white/10 pt-2 text-sm font-semibold text-amber-300">
						<span>Estimated cost</span>
						<span>
							{formatDisplayKeyPrice(preview.estimatedTotalCostStroops)}
						</span>
					</div>
				</div>
			)}
		</div>
	);
};

export default PortfolioRebalancePanel;
