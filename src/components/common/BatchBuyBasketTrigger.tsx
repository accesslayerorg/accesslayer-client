/**
 * BatchBuyBasketTrigger (#954)
 *
 * Floating action button that opens the batch buy basket panel.
 * Renders as a fixed-position button in the bottom-right corner of the
 * viewport with an animated badge showing the number of items in the basket.
 *
 * Hidden when the basket is empty so it doesn't distract users who aren't
 * using the batch buy feature.
 */

import { AnimatePresence, motion } from 'framer-motion';
import { ShoppingBasket } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
	useBatchBuyStore,
	selectItemCount,
	selectHasItems,
} from '@/hooks/useBatchBuyStore';

export interface BatchBuyBasketTriggerProps {
	onClick: () => void;
	className?: string;
}

const BatchBuyBasketTrigger: React.FC<BatchBuyBasketTriggerProps> = ({
	onClick,
	className,
}) => {
	const itemCount = useBatchBuyStore(selectItemCount);
	const hasItems = useBatchBuyStore(selectHasItems);

	return (
		<AnimatePresence>
			{hasItems && (
				<motion.button
					key="basket-trigger"
					type="button"
					onClick={onClick}
					initial={{ scale: 0.6, opacity: 0, y: 20 }}
					animate={{ scale: 1, opacity: 1, y: 0 }}
					exit={{ scale: 0.6, opacity: 0, y: 20 }}
					whileHover={{ scale: 1.06 }}
					whileTap={{ scale: 0.95 }}
					transition={{ type: 'spring', stiffness: 350, damping: 25 }}
					aria-label={`Open batch basket — ${itemCount} item${itemCount !== 1 ? 's' : ''}`}
					className={cn(
						'fixed bottom-6 right-6 z-30',
						'flex size-14 items-center justify-center rounded-full',
						'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/30',
						'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
						'transition-shadow hover:shadow-amber-500/50',
						className
					)}
				>
					<ShoppingBasket className="size-6" aria-hidden="true" />

					{/* Item count badge */}
					<AnimatePresence mode="popLayout">
						<motion.span
							key={itemCount}
							initial={{ scale: 0.5, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							exit={{ scale: 0.5, opacity: 0 }}
							transition={{ type: 'spring', stiffness: 400, damping: 20 }}
							className={cn(
								'absolute -right-1 -top-1',
								'flex min-w-[1.25rem] items-center justify-center rounded-full',
								'bg-slate-900 px-1 py-0.5',
								'text-[0.6rem] font-black tabular-nums text-amber-400',
								'border border-amber-500/30'
							)}
							aria-hidden="true"
						>
							{itemCount > 99 ? '99+' : itemCount}
						</motion.span>
					</AnimatePresence>
				</motion.button>
			)}
		</AnimatePresence>
	);
};

export default BatchBuyBasketTrigger;
