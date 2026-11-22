import React from 'react';
import { KeyRound } from 'lucide-react';
import EmptyState from '@/components/common/EmptyState';
import { cn } from '@/lib/utils';

export interface HoldingsEmptyStateProps {
	className?: string;
	/** Creator discovery path, including optional navigation context. */
	browseHref?: string;
}

/**
 * Shown when the holdings query has settled with zero creator keys (#545).
 * Standardised on top of the unified EmptyState component.
 * Links the CTA to creator discovery with context.
 */
const HoldingsEmptyState: React.FC<HoldingsEmptyStateProps> = ({
	className,
	browseHref = '/discovery?source=empty-holdings',
}) => (
	<EmptyState
		data-testid="holdings-empty-state"
		className={cn('mt-6', className)}
		icon={
			<span className="relative z-10 flex size-16 items-center justify-center rounded-full border border-white/10 bg-white/5 sm:size-20">
				<KeyRound
					className="size-7 text-white/40 sm:size-8"
					aria-hidden="true"
				/>
			</span>
		}
		title="No creator keys yet"
		message="You don't hold any creator keys yet. Discover creators to get started."
		cta={{
			label: 'Discover creators',
			href: browseHref,
		}}
	/>
);

export default HoldingsEmptyState;
