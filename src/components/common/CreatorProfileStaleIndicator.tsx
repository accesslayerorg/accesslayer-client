import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreatorProfileStaleIndicatorProps {
	/** Whether the badge should be visible. */
	visible: boolean;
	/** Whether a refetch is currently in progress. */
	isRefetching?: boolean;
	/** Callback when user clicks the badge to refresh. */
	onRefresh: () => void;
	/** Custom className for styling. */
	className?: string;
}

/**
 * Interactive stale data indicator badge for creator profile.
 *
 * Shows when:
 * - Data hasn't been refreshed in 60+ seconds
 * - User has already seen the initial data load
 *
 * Clicking the badge triggers an immediate refetch and hides itself.
 * The badge also auto-hides when a background refetch completes.
 *
 * Accessibility:
 * - Role: button (user can interact to refresh)
 * - Aria-label: describes the action
 * - Focus-visible for keyboard navigation
 * - Screen readers announced via role
 */
const CreatorProfileStaleIndicator: React.FC<
	CreatorProfileStaleIndicatorProps
> = ({ visible, isRefetching = false, onRefresh, className }) => {
	const [isAnimatingOut, setIsAnimatingOut] = useState(false);

	// When refetch completes, auto-hide the badge
	useEffect(() => {
		if (!isRefetching && visible && isAnimatingOut) {
			// Refetch just completed, trigger exit animation
			setIsAnimatingOut(false);
		}
	}, [isRefetching, visible, isAnimatingOut]);

	const handleClick = () => {
		onRefresh();
		// Badge will auto-hide when refetch completes
	};

	return (
		<AnimatePresence>
			{visible && !isAnimatingOut && (
				<motion.button
					type="button"
					initial={{ opacity: 0, scale: 0.95, y: -8 }}
					animate={{ opacity: 1, scale: 1, y: 0 }}
					exit={{ opacity: 0, scale: 0.95, y: -8 }}
					transition={{
						duration: 0.2,
						ease: 'easeOut',
					}}
					onClick={handleClick}
					disabled={isRefetching}
					aria-label="Data may be outdated. Click to refresh."
					className={cn(
						'inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 transition-all duration-300 hover:border-amber-500/60 hover:bg-amber-500/25 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed',
						className
					)}
				>
					<span
						className={cn(
							'text-xs font-semibold tracking-wide text-amber-200',
							isRefetching ? 'opacity-75' : 'opacity-100'
						)}
					>
						{isRefetching ? 'Refreshing...' : 'Data may be outdated — refresh'}
					</span>
					<motion.div
						animate={isRefetching ? { rotate: 360 } : { rotate: 0 }}
						transition={{
							duration: isRefetching ? 1 : 0.3,
							repeat: isRefetching ? Infinity : 0,
							ease: 'linear',
						}}
						className="shrink-0"
					>
						<RefreshCw
							size={14}
							className={cn(
								'text-amber-200 transition-colors',
								isRefetching ? 'opacity-100' : 'opacity-75'
							)}
						/>
					</motion.div>
				</motion.button>
			)}
		</AnimatePresence>
	);
};

export default CreatorProfileStaleIndicator;
