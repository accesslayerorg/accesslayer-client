import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
	computeRemainingLockupSeconds,
	formatCountdownTime,
} from '@/utils/lockupCountdown.utils';

export interface LockupCountdownProps {
	lastBuyTimestamp?: number | string | null;
	onExpire?: () => void;
	className?: string;
}

export const LockupCountdown: React.FC<LockupCountdownProps> = ({
	lastBuyTimestamp,
	onExpire,
	className,
}) => {
	const [remainingSeconds, setRemainingSeconds] = useState<number>(() =>
		computeRemainingLockupSeconds(lastBuyTimestamp)
	);

	useEffect(() => {
		const initialRemaining = computeRemainingLockupSeconds(lastBuyTimestamp);
		setRemainingSeconds(initialRemaining);

		if (initialRemaining <= 0) {
			onExpire?.();
			return;
		}

		const intervalId = setInterval(() => {
			const rem = computeRemainingLockupSeconds(lastBuyTimestamp);
			setRemainingSeconds(rem);

			if (rem <= 0) {
				clearInterval(intervalId);
				onExpire?.();
			}
		}, 1000);

		return () => clearInterval(intervalId);
	}, [lastBuyTimestamp, onExpire]);

	if (remainingSeconds <= 0 || !lastBuyTimestamp) {
		return null;
	}

	const formattedTime = formatCountdownTime(remainingSeconds);

	return (
		<div
			className={cn(
				'inline-flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-300',
				className
			)}
			data-testid="lockup-countdown"
			aria-label={`Lockup remaining: ${formattedTime}`}
		>
			<Clock className="size-3.5 shrink-0 text-amber-400 animate-pulse" />
			<span className="font-mono tabular-nums" data-testid="lockup-timer-text">
				{formattedTime}
			</span>
		</div>
	);
};

export default LockupCountdown;
