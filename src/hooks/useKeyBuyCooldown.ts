import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { courseService } from '@/services/course.service';

/**
 * Per-wallet buy cooldown for a creator key (#915).
 *
 * Reads the connected wallet's cooldown expiry for `keyId`. The query is
 * disabled until both a `keyId` and a `wallet` are known, so the fetch fires
 * exactly when the key page loads with a connected wallet, and again whenever
 * the wallet changes (i.e. on connect/disconnect) because the key — and
 * therefore the cache entry — is wallet-scoped.
 *
 * A `null` result is a valid "no cooldown" answer, not an error: the service
 * maps 404s and empty payloads to `null`. The key detail page falls back to the
 * held-position and creator-wide `nextBuyAllowedAt` values when this returns
 * nothing, so the cooldown UI still works against backends that have not
 * shipped the endpoint.
 *
 * `staleTime` is short because the countdown is a hard gate on buying: after a
 * buy resolves, the previous expiry is already in the past and the next window
 * must be picked up promptly rather than served from a long-lived cache entry.
 */
export function useKeyBuyCooldown(
	keyId: string | undefined,
	wallet: string | undefined
) {
	return useQuery({
		queryKey: queryKeys.creators.buyCooldown(keyId ?? '', wallet ?? ''),
		queryFn: () => courseService.getKeyBuyCooldown(keyId!, wallet!),
		enabled: Boolean(keyId && wallet),
		staleTime: 15_000,
		retry: false,
	});
}
