import {
	useQuery,
	useQueryClient,
	type UseQueryResult,
} from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
	courseService,
	type TradeCooldownInfo,
} from '@/services/course.service';
import type {
	TradeCooldownStatus,
	ActiveTradeCooldown,
} from '@/utils/tradeCooldown.utils';
import { isActiveCooldown } from '@/utils/tradeCooldown.utils';

export type { TradeCooldownInfo };

/**
 * Fetches the trade cooldown status for a creator key and the connected
 * wallet (#998, #915).
 *
 * The cache is scoped per wallet, so the status is fetched on page load and
 * again whenever a wallet connects or switches — a previous wallet's cooldown
 * is never shown for the new one. With no wallet connected there is no
 * per-wallet cooldown, so nothing is fetched. It is refreshed after every
 * completed transaction: `invalidateTradeCooldownStatus`
 * is exported so trade mutations can drop the cached cooldown and force a
 * refetch, which is how buttons re-enable as soon as the backend reports the
 * cooldown has lifted.
 */
export function useTradeCooldownStatus(
	keyId: string,
	walletAddress?: string | null
): UseQueryResult<TradeCooldownStatus | null> {
	return useQuery<TradeCooldownStatus | null>({
		queryKey: queryKeys.creators.tradeCooldown(keyId, walletAddress ?? ''),
		queryFn: async () => {
			// The endpoint has no per-wallet identity in the payload — the
			// creatorId is the key we asked about.
			const info = await courseService.getTradeCooldownStatus(keyId);
			return info ? { ...info, creatorId: keyId } : null;
		},
		enabled: Boolean(keyId) && Boolean(walletAddress),
		staleTime: 15_000,
		retry: false,
	});
}

/**
 * Drops the cached trade-cooldown status for a key so the next render
 * refetches it. Called after a successful trade so the cooldown countdown
 * reflects the freshly committed cooldown instead of stale data.
 */
export function invalidateTradeCooldownStatus(
	queryClient: ReturnType<typeof useQueryClient>,
	keyId: string
): void {
	void queryClient.invalidateQueries({
		queryKey: queryKeys.creators.tradeCooldown(keyId),
	});
}

/**
 * Resolves the cooldown that is actively blocking trades for this key right
 * now, or `null` when no cooldown is in force. Falls back to the per-key
 * position-level `nextBuyAllowedAt` from the user's holdings when the
 * dedicated cooldown endpoint has no data, mirroring the precedence used by
 * the key detail page (#873).
 */
export function resolveActiveTradeCooldown(
	status: TradeCooldownStatus | null | undefined,
	fallbackNextBuyAllowedAt?: number | string | null
): ActiveTradeCooldown | null {
	const effective: TradeCooldownStatus | null | undefined =
		status ?? (fallbackNextBuyAllowedAt != null
			? { creatorId: '', nextBuyAllowedAt: fallbackNextBuyAllowedAt }
			: null);

	if (!isActiveCooldown(effective)) return null;

	// Preserve the policy duration reported by the dedicated endpoint so
	// tooltips can explain the creator-set cooldown window.
	return {
		creatorId: effective.creatorId ?? '',
		nextBuyAllowedAt: effective.nextBuyAllowedAt,
		cooldownDurationSeconds: effective.cooldownDurationSeconds ?? null,
	};
}
