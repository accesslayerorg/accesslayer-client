import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import EmptyState from '@/components/common/EmptyState';
import { cn } from '@/lib/utils';

interface ClearedFiltersEmptyStateProps {
	/**
	 * Called when the user clicks "Browse all creators".
	 * Typically resets sort to 'featured' and clears any residual state.
	 */
	onBrowseAll?: () => void;
	className?: string;
}

/**
 * Shown when all filters have been cleared but the creator list is still
 * empty (#545). Standardised on top of the unified EmptyState component.
 */
const ClearedFiltersEmptyState: React.FC<ClearedFiltersEmptyStateProps> = ({
	onBrowseAll,
	className,
}) => (
	<EmptyState
		role="status"
		aria-label="No creators available"
		className={cn('w-full', className)}
		icon={
			<span className="relative z-10 flex size-16 items-center justify-center rounded-full border border-white/10 bg-white/5">
				<SlidersHorizontal
					className="size-7 text-white/40"
					aria-hidden="true"
				/>
			</span>
		}
		title="Nothing here yet"
		message="Your filters are cleared, but no creators are available right now. Check back soon or try browsing all categories."
		cta={
			onBrowseAll
				? {
						label: 'Browse all creators',
						onClick: onBrowseAll,
				  }
				: undefined
		}
	/>
);

export default ClearedFiltersEmptyState;
