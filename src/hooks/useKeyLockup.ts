import { useQueries, useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { courseService, type KeyLockup } from '@/services/course.service';

export type { KeyLockup };

/** A sell lock-up that is in force right now. */
export interface ActiveKeyLockup {
	/** Absolute timestamp (ms epoch) at which the position becomes sellable. */
	unlockAtMs: number;
	/** Whole seconds until unlock, rounded up. */
	remainingSeconds: number;
}

/**
 * Normalises a numeric (seconds or ms epoch) or ISO-string timestamp into
 * milliseconds since the epoch. Returns `null` for unparseable input.
 */
function normalizeTimestampToMs(timestamp: number | string): number | null {
	if (typeof timestamp === 'number') {
		if (!Number.isFinite(timestamp)) return null;
		return timestamp > 1e11
			? Math.floor(timestamp)
			: Math.floor(timestamp * 1000);
	}

	const parsed = new Date(timestamp).getTime();
	return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Resolves whether a lock-up is in force at the given moment (#1163).
 *
 * Returns the active lock-up with its remaining time, or `null` when there
 * is no lock-up data, the backend reports it inactive, or the unlock
 * timestamp has passed — so the badge and sell block drop off automatically
 * at the unlock timestamp.
 */
export function resolveActiveKeyLockup(
	lockup: KeyLockup | null | undefined,
	nowMs: number = Date.now()
): ActiveKeyLockup | null {
	if (!lockup || lockup.isActive === false) return null;

	const raw = lockup.unlockAt ?? lockup.unlockedAt;
	if (raw == null) return null;

	const unlockAtMs = normalizeTimestampToMs(raw);
	if (unlockAtMs == null) return null;

	const remainingMs = unlockAtMs - nowMs;
	if (remainingMs <= 0) return null;

	return {
		unlockAtMs,
		remainingSeconds: Math.ceil(remainingMs / 1000),
	};
}

/**
 * Fetches the sell lock-up status for a creator key and wallet (#1163).
 *
 * The cache is scoped per wallet and only fetched when a wallet is
 * connected; a 404 from the backend resolves to `null` (no lock-up record),
 * keeping sell buttons enabled for unlocked positions.
 */
export function useKeyLockup(
	keyId: string,
	walletAddress?: string | null
) {
	return useQuery<KeyLockup | null>({
		queryKey: queryKeys.creators.lockup(keyId, walletAddress ?? ''),
		queryFn: () => courseService.getKeyLockup(keyId, walletAddress ?? ''),
		enabled: Boolean(keyId) && Boolean(walletAddress),
		staleTime: 15_000,
		retry: false,
	});
}

/**
 * Batch variant for portfolio views: fetches the lock-up status for every
 * held key at once. React Query dedupes and caches per key+wallet, so rows
 * sharing a wallet never double-fetch.
 */
export function useKeyLockups(
	walletAddress: string | null | undefined,
	keyIds: string[]
) {
	return useQueries({
		queries: keyIds.map(keyId => ({
			queryKey: queryKeys.creators.lockup(keyId, walletAddress ?? ''),
			queryFn: () => courseService.getKeyLockup(keyId, walletAddress ?? ''),
			enabled: Boolean(keyId) && Boolean(walletAddress),
			staleTime: 15_000,
			retry: false,
		})),
	});
}
