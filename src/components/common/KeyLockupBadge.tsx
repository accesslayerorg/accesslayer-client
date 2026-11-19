import React from 'react';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatUnlockCountdown } from '@/utils/lockupCountdown.utils';
import { useRemainingUnlockSeconds } from '@/hooks/useKeyLockup';

export interface KeyLockupBadgeProps {
	/** Absolute unlock timestamp (seconds epoch, ms epoch, or ISO string). */
	unlockAt?: number | string | null;
	className?: string;
}

/**
 * Amber "Locked" pill with a live days/hours/minutes countdown until the
 * position can be sold again (#1163). Renders nothing once the unlock
 * timestamp has passed, so the badge removes itself at expiry.
 */
export const KeyLockupBadge: React.FC<KeyLockupBadgeProps> = ({
	unlockAt,
	className,
}) => {
	const remainingSeconds = useRemainingUnlockSeconds(unlockAt);

	if (remainingSeconds <= 0 || !unlockAt) return null;

	const formattedCountdown = formatUnlockCountdown(remainingSeconds);

	let unlockLabel: string | null = null;
	if (typeof unlockAt === 'number') {
		unlockLabel = new Date(
			unlockAt > 1e11 ? unlockAt : unlockAt * 1000
		).toLocaleString();
	} else if (typeof unlockAt === 'string') {
		const parsed = new Date(unlockAt);
		if (!isNaN(parsed.getTime())) unlockLabel = parsed.toLocaleString();
	}

	return (
		<span
			className={cn(
				'inline-flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-300',
				className
			)}
			data-testid="key-lockup-badge"
			title={
				unlockLabel
					? `Selling unlocks at ${unlockLabel}`
					: 'Selling is locked'
			}
		>
			<Lock className="size-3.5 shrink-0 text-amber-400" aria-hidden="true" />
			<span>Locked</span>
			<span
				className="font-mono tabular-nums"
				data-testid="key-lockup-countdown"
			>
				{formattedCountdown}
			</span>
		</span>
	);
};

export default KeyLockupBadge;
