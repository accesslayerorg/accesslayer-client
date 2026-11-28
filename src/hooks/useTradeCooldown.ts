import { useEffect, useMemo, useState } from 'react';
import {
	useTradeCooldownStatus,
	resolveActiveTradeCooldown,
} from '@/hooks/useTradeCooldownStatus';
import { getCooldownRemainingSeconds } from '@/utils/tradeCooldown.utils';

export interface UseTradeCooldownResult {
	remainingSeconds: number;
	isCoolingDown: boolean;
	cooldownEndsAt: number | null;
	cooldownDurationSeconds: number | null;
	isLoading: boolean;
	refetch: () => Promise<unknown>;
}

/**
 * Live, wallet-scoped trade cooldown countdown for a key.
 */
export function useTradeCooldown(
	keyId: string,
	wallet?: string | null
): UseTradeCooldownResult {
	const query = useTradeCooldownStatus(keyId, wallet);
	const activeCooldown = useMemo(
		() => resolveActiveTradeCooldown(query.data),
		[query.data]
	);
	const [remainingSeconds, setRemainingSeconds] = useState(() =>
		activeCooldown ? getCooldownRemainingSeconds(activeCooldown) : 0
	);

	useEffect(() => {
		if (!activeCooldown) {
			setRemainingSeconds(0);
			return;
		}

		const update = () =>
			setRemainingSeconds(getCooldownRemainingSeconds(activeCooldown));
		update();
		const intervalId = window.setInterval(update, 1000);
		return () => window.clearInterval(intervalId);
	}, [activeCooldown]);

	const cooldownEndsAt =
		activeCooldown &&
		getCooldownRemainingSeconds(activeCooldown) > 0
			? typeof activeCooldown.nextBuyAllowedAt === 'number' &&
			  activeCooldown.nextBuyAllowedAt > 1e11
				? activeCooldown.nextBuyAllowedAt
				: typeof activeCooldown.nextBuyAllowedAt === 'number'
					? activeCooldown.nextBuyAllowedAt * 1000
					: new Date(activeCooldown.nextBuyAllowedAt).getTime()
			: null;

	return {
		remainingSeconds,
		isCoolingDown: remainingSeconds > 0,
		cooldownEndsAt:
			cooldownEndsAt != null && Number.isFinite(cooldownEndsAt)
				? cooldownEndsAt
				: null,
		cooldownDurationSeconds:
			activeCooldown?.cooldownDurationSeconds ?? null,
		isLoading: query.isLoading,
		refetch: query.refetch,
	};
}

export default useTradeCooldown;
