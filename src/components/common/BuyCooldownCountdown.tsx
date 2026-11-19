import React, { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
	computeRemainingCooldownSeconds,
	formatCooldownDuration,
} from '@/utils/buyCooldown.utils';

export interface BuyCooldownCountdownProps {
	/** Timestamp (ms epoch, seconds epoch, or ISO string) after which the authenticated user can next buy this key. */
	nextBuyAllowedAt?: number | string | null;
	onExpire?: () => void;
	className?: string;
}

/**
 * Self-updating countdown shown on the key detail page indicating when the
 * authenticated user can next buy this key (#873), e.g. "Next buy available
 * in 4m 32s". Renders nothing when there is no cooldown in effect or no
 * cooldown data is available — this only reflects real `nextBuyAllowedAt`
 * data, it never fabricates a timer.
 */
export const BuyCooldownCountdown: React.FC<BuyCooldownCountdownProps> = ({
	nextBuyAllowedAt,
	onExpire,
	className,
}) => {
	const [remainingSeconds, setRemainingSeconds] = useState<number>(() =>
		computeRemainingCooldownSeconds(nextBuyAllowedAt)
	);

	useEffect(() => {
		const initialRemaining = computeRemainingCooldownSeconds(nextBuyAllowedAt);
		setRemainingSeconds(initialRemaining);

		if (initialRemaining <= 0) {
			onExpire?.();
			return;
		}

		const intervalId = setInterval(() => {
			const rem = computeRemainingCooldownSeconds(nextBuyAllowedAt);
			setRemainingSeconds(rem);

			if (rem <= 0) {
				clearInterval(intervalId);
				onExpire?.();
			}
		}, 1000);

		return () => clearInterval(intervalId);
	}, [nextBuyAllowedAt, onExpire]);

	if (remainingSeconds <= 0 || !nextBuyAllowedAt) {
		return null;
	}

	const formattedTime = formatCooldownDuration(remainingSeconds);

	return (
		<div
			className={cn(
				'inline-flex items-center gap-1.5 rounded-lg border border-sky-500/20 bg-sky-500/10 px-2.5 py-1 text-xs font-semibold text-sky-300',
				className
			)}
			data-testid="buy-cooldown-countdown"
			role="status"
			aria-live="polite"
			aria-label={`Next buy available in ${formattedTime}`}
		>
			<Timer className="size-3.5 shrink-0 text-sky-400" />
			<span data-testid="buy-cooldown-text">
				Next buy available in{' '}
				<span className="font-mono tabular-nums">{formattedTime}</span>
			</span>
		</div>
	);
};

export default BuyCooldownCountdown;
