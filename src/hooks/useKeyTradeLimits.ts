import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
	courseService,
	type KeyTradeLimits,
} from '@/services/course.service';

const TRADE_LIMITS_STALE_TIME_MS = 60_000;

/**
 * Per-swap buy/sell size limits for a key (#1160).
 *
 * Reads `GET /keys/:keyId/trade-limits`. Limits are null when the creator has
 * not configured them, and the query reports no limits while loading or on
 * error so the swap panel stays usable without the helper text.
 */
export function useKeyTradeLimits(creatorId: string | undefined) {
	const query = useQuery({
		queryKey: queryKeys.creators.tradeLimits(creatorId ?? ''),
		queryFn: () => courseService.getKeyTradeLimits(creatorId ?? ''),
		enabled: Boolean(creatorId),
		staleTime: TRADE_LIMITS_STALE_TIME_MS,
	});

	const limits: KeyTradeLimits = query.data ?? { maxBuy: null, maxSell: null };

	return { limits, isLoading: query.isLoading };
}
