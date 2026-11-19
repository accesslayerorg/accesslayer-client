import React from 'react';
import { KeyRound } from 'lucide-react';
import EmptyState from '@/components/common/EmptyState';
import { cn } from '@/lib/utils';

export interface HoldingsEmptyStateProps {
	className?: string;
	/** Creator discovery path — defaults to marketplace creators route. */
	browseHref?: string;
}

/**
 * Shown when the holdings query has settled with zero creator keys (#545).
 * Standardised on top of the unified EmptyState component.
 * Links the CTA to the creator discovery page.
 */
const HoldingsEmptyState: React.FC<HoldingsEmptyStateProps> = ({
	className,
	browseHref = '/creators',
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
		message="This wallet doesn't hold any creator keys right now. Browse creators and secure your first key."
		cta={{
			label: 'Browse creators',
			href: browseHref,
		}}
	/>
);

export default HoldingsEmptyState;
