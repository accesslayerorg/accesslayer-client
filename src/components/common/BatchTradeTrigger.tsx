import React from 'react';
import { Layers } from 'lucide-react';
import {
	useBatchTradeStore,
	selectBatchItemCount,
} from '@/hooks/useBatchTradeStore';
import { cn } from '@/lib/utils';

export interface BatchTradeTriggerProps {
	onClick?: () => void;
	className?: string;
}

/**
 * Batch trade drawer trigger button (#1155).
 *
 * Shows the number of queued trades in the badge and opens the Batch Trade drawer.
 */
export const BatchTradeTrigger: React.FC<BatchTradeTriggerProps> = ({
	onClick,
	className,
}) => {
	const itemCount = useBatchTradeStore(selectBatchItemCount);
	const openDrawer = useBatchTradeStore(state => state.openDrawer);

	const handleClick = onClick ?? openDrawer;

	return (
		<button
			type="button"
			onClick={handleClick}
			aria-label={`Open batch trade drawer (${itemCount} order${itemCount !== 1 ? 's' : ''})`}
			data-testid="batch-trade-trigger"
			className={cn(
				'fixed bottom-20 right-18 z-40 flex size-12 items-center justify-center rounded-full',
				'bg-slate-800 border border-amber-400/30 text-amber-300 shadow-xl shadow-black/40 transition-all hover:bg-slate-700 hover:border-amber-400/60',
				'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#06111f]',
				'md:bottom-6 md:right-22',
				className
			)}
		>
			<Layers className="size-5" aria-hidden="true" />
			{itemCount > 0 && (
				<span
					className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-amber-400 font-mono text-[0.65rem] font-bold text-slate-950"
					data-testid="batch-trade-count"
				>
					{itemCount}
				</span>
			)}
		</button>
	);
};

export default BatchTradeTrigger;
