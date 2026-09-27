import { useEffect, useRef, useState } from 'react';
import {
	computeRemainingCooldownSeconds,
	formatCooldownDuration,
} from '@/utils/buyCooldown.utils';

export interface UseBuyCooldownCountdownResult {
	/** Seconds left until the wallet may next buy; 0 when no cooldown is active. */
	remainingSeconds: number;
	/** `remainingSeconds` as a compact human string, e.g. "4m 32s". */
	formattedRemaining: string;
	/** True while the wallet is locked out; flips to false the moment it expires. */
	isActive: boolean;
}

/**
 * Ticking buy-cooldown clock (#915).
 *
 * Owns the single source of truth for "how long until this wallet can buy
 * again" so the countdown chip and the Buy button can never disagree: both
 * derive their state from the same absolute `nextBuyAllowedAt`, and
 * `isActive` flips to `false` on the tick that crosses zero, which is what
 * re-enables the button without a refetch.
 *
 * The interval only runs while a cooldown is actually in effect, so a key with
 * no cooldown costs no timers. `onExpire` fires once per expiry, from a ref
 * so that passing an inline callback does not restart the interval.
 */
export function useBuyCooldownCountdown(
	nextBuyAllowedAt?: number | string | null,
	onExpire?: () => void
): UseBuyCooldownCountdownResult {
	const [remainingSeconds, setRemainingSeconds] = useState<number>(() =>
		computeRemainingCooldownSeconds(nextBuyAllowedAt)
	);

	const onExpireRef = useRef(onExpire);
	useEffect(() => {
		onExpireRef.current = onExpire;
	}, [onExpire]);

	useEffect(() => {
		const initial = computeRemainingCooldownSeconds(nextBuyAllowedAt);
		setRemainingSeconds(initial);

		if (initial <= 0) return;

		let expired = false;
		const intervalId = setInterval(() => {
			const remaining = computeRemainingCooldownSeconds(nextBuyAllowedAt);
			setRemainingSeconds(remaining);

			if (remaining <= 0) {
				clearInterval(intervalId);
				if (!expired) {
					expired = true;
					onExpireRef.current?.();
				}
			}
		}, 1000);

		return () => clearInterval(intervalId);
	}, [nextBuyAllowedAt]);

	const isActive = remainingSeconds > 0;

	return {
		remainingSeconds,
		formattedRemaining: isActive
			? formatCooldownDuration(remainingSeconds)
			: formatCooldownDuration(0),
		isActive,
	};
}
