import React from 'react';
import toast from 'react-hot-toast';
import { CheckCircle2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDisplayKeyPrice } from '@/utils/keyPriceDisplay.utils';
import TransactionHashRow from '@/components/common/TransactionHashRow';
import type { BatchSwapReceipt } from '@/types/batchTrade.types';

export interface BatchSwapExecutedToastProps {
	toastId: string;
	receipt: BatchSwapReceipt;
}

/**
 * Toast component rendered when a batch swap confirms (#1155).
 * Surfaces a per-item summary with direction, quantity, key name, and cost.
 */
export const BatchSwapExecutedToast: React.FC<BatchSwapExecutedToastProps> = ({
	toastId,
	receipt,
}) => {
	return (
		<div
			role="status"
			aria-live="polite"
			data-testid="batch-swap-executed-toast"
			className={cn(
				'pointer-events-auto flex w-full max-w-md flex-col gap-3 rounded-2xl',
				'border border-emerald-500/30 bg-slate-900 p-4 text-white shadow-2xl shadow-emerald-500/10'
			)}
		>
			{/* Header */}
			<div className="flex items-center justify-between border-b border-white/10 pb-2.5">
				<div className="flex items-center gap-2">
					<div className="flex size-7 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
						<CheckCircle2 className="size-4" aria-hidden="true" />
					</div>
					<div>
						<h4 className="font-jakarta text-sm font-bold text-white">
							Batch Swap Executed
						</h4>
						<p className="text-xs text-white/50">
							{receipt.items.length} order{receipt.items.length !== 1 ? 's' : ''}{' '}
							settled atomically
						</p>
					</div>
				</div>

				<button
					type="button"
					onClick={() => toast.dismiss(toastId)}
					aria-label="Dismiss notification"
					className="flex size-6 items-center justify-center rounded-md text-white/40 hover:bg-white/10 hover:text-white"
				>
					<X className="size-3.5" aria-hidden="true" />
				</button>
			</div>

			{/* Per-item summary */}
			<div className="space-y-1.5" data-testid="batch-swap-toast-items">
				{receipt.items.map((item, idx) => {
					const isBuy = item.direction === 'buy';
					return (
						<div
							key={`${item.keyId}-${idx}`}
							data-testid="batch-swap-toast-item"
							data-key-id={item.keyId}
							className="flex items-center justify-between rounded-lg bg-white/[0.03] px-2.5 py-1.5 text-xs"
						>
							<div className="flex items-center gap-2 min-w-0">
								<span
									className={cn(
										'inline-flex items-center rounded px-1.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider',
										isBuy
											? 'border border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
											: 'border border-amber-500/30 bg-amber-500/15 text-amber-300'
									)}
								>
									{item.direction}
								</span>
								<span className="font-semibold text-white/90">
									{item.amount}x
								</span>
								<span className="truncate font-medium text-white/70" title={item.keyName}>
									{item.keyName}
								</span>
							</div>

							<span className="shrink-0 font-mono text-white/80 tabular-nums">
								{formatDisplayKeyPrice(item.costStroops)}
							</span>
						</div>
					);
				})}
			</div>

			{/* Total + Transaction Hash */}
			<div className="flex items-center justify-between border-t border-white/10 pt-2 text-xs">
				<span className="text-white/50">Total Outlay</span>
				<span className="font-mono font-bold text-amber-300 tabular-nums">
					{formatDisplayKeyPrice(receipt.totalCostStroops)}
				</span>
			</div>

			{receipt.transactionHash && (
				<TransactionHashRow
					hash={receipt.transactionHash}
					className="mt-0.5 rounded-lg bg-white/5 px-2.5 py-1"
				/>
			)}
		</div>
	);
};

export default BatchSwapExecutedToast;
