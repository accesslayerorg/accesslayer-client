import React from 'react';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatLockupCountdown } from '@/utils/lockupCountdown.utils';

export interface KeyLockupBadgeProps {
	/** Whole seconds until the position unlocks. */
	remainingSeconds: number;
	className?: string;
}

/**
 * Amber "Locked · 2d 14h 32m remaining" pill shown on portfolio holdings
 * whose position is under the server-backed sell lock-up (#1163). Renders
 * nothing once the lock-up has expired so the badge drops off automatically
 * at the unlock timestamp.
 */
export const KeyLockupBadge: React.FC<KeyLockupBadgeProps> = ({
	remainingSeconds,
	className,
}) => {
	if (remainingSeconds <= 0) return null;

	const formatted = formatLockupCountdown(remainingSeconds);

	return (
		<span
			className={cn(
				'inline-flex max-w-full items-center gap-1 rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300',
				className
			)}
			title={`Selling unlocks in ${formatted}`}
			data-testid="key-lockup-badge"
		>
			<Lock className="size-3 shrink-0" aria-hidden="true" />
			<span className="truncate">
				Locked · {formatted} remaining
			</span>
		</span>
	);
};

export default KeyLockupBadge;
