import { useEffect, useState } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { courseService, type KeyLockupInfo } from '@/services/course.service';
import { computeRemainingUnlockSeconds } from '@/utils/lockupCountdown.utils';

export type { KeyLockupInfo };

/**
 * Fetches the wallet-scoped lock-up status for a creator key (#1163).
 *
 * The cache is scoped per wallet, so the status is fetched on page load and
 * again whenever a wallet connects or switches. With no wallet connected
 * there is no per-wallet lock-up, so nothing is fetched. The backend
 * answers 404 when no lock-up record exists, which the service maps to
 * `null` — unlocked.
 */
export function useKeyLockup(
	keyId: string,
	walletAddress?: string | null
): UseQueryResult<KeyLockupInfo | null> {
	return useQuery<KeyLockupInfo | null>({
		queryKey: queryKeys.creators.lockup(keyId, walletAddress ?? ''),
		queryFn: () => courseService.getKeyLockup(keyId, walletAddress ?? ''),
		enabled: Boolean(keyId) && Boolean(walletAddress),
		staleTime: 15_000,
		retry: false,
	});
}

/**
 * Seconds remaining until the lock-up unlocks, ticking every second.
 * Returns 0 once the unlock timestamp has passed (or when absent), so
 * callers drop the lock-up UI automatically at expiry (#1163).
 */
export function useRemainingUnlockSeconds(
	unlockAt?: number | string | null
): number {
	const [remainingSeconds, setRemainingSeconds] = useState(() =>
		computeRemainingUnlockSeconds(unlockAt)
	);

	useEffect(() => {
		setRemainingSeconds(computeRemainingUnlockSeconds(unlockAt));

		if (!unlockAt) return;

		const intervalId = setInterval(() => {
			setRemainingSeconds(computeRemainingUnlockSeconds(unlockAt));
		}, 1000);

		return () => clearInterval(intervalId);
	}, [unlockAt]);

	return remainingSeconds;
}

/**
 * Whether a lock-up is currently in force (#1163). When the backend
 * reports an unlock timestamp the lock is active only while that
 * timestamp is in the future, so the badge and sell block remove
 * themselves the moment the countdown reaches zero. When no timestamp is
 * reported, the explicit isLocked flag is the source of truth.
 */
export function isKeyLockupActive(
	info: KeyLockupInfo | null | undefined,
	remainingSeconds: number
): boolean {
	if (!info) return false;
	if (info.unlockAt != null) return remainingSeconds > 0;
	return info.isLocked === true;
}
