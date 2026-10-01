import React from 'react';
import { cn } from '@/lib/utils';
import { getBundleTimeRemainingState } from '@/utils/bundle.utils';

export interface BundleTimeRemainingProps {
	expiresAt: string | null | undefined;
	nowMs: number;
	className?: string;
}

/**
 * Countdown cell for a bundle's expiry.
 *
 * Reuses the same shared countdown formatting as the drops countdown so the UI
 * is consistent across the app; switches to "Expired" at the moment the bundle
 * lapses.
 */
export const BundleTimeRemaining: React.FC<BundleTimeRemainingProps> = ({
	expiresAt,
	nowMs,
	className,
}) => {
	const { isExpired, label } = getBundleTimeRemainingState(expiresAt, nowMs);

	return (
		<span
			className={cn(
				'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium tabular-nums',
				isExpired
					? 'border-red-400/30 bg-red-400/10 text-red-300'
					: 'border-amber-400/30 bg-amber-400/15 text-amber-200',
				className
			)}
			data-testid="bundle-time-remaining"
			aria-live="polite"
		>
			{label}
		</span>
	);
};

export default BundleTimeRemaining;
