import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
	fetchKeyDepth,
	KEY_DEPTH_LEVELS,
} from '@/services/keyDepth.service';

/**
 * How often the order-book depth is refreshed (#1220).
 *
 * Five seconds keeps the ladder close to live without hammering the backend.
 */
export const KEY_DEPTH_REFRESH_INTERVAL_MS = 5_000;

/**
 * Order-book depth for a key.
 *
 * The snapshot is polled every {@link KEY_DEPTH_REFRESH_INTERVAL_MS}; React
 * Query keeps the previous data in place while a refresh is in flight, so the
 * chart updates in place instead of flashing a skeleton.
 */
export function useKeyDepth(keyId: string, levels: number = KEY_DEPTH_LEVELS) {
	return useQuery({
		queryKey: queryKeys.creators.depth(keyId, levels),
		queryFn: () => fetchKeyDepth(keyId, levels),
		enabled: Boolean(keyId),
		staleTime: KEY_DEPTH_REFRESH_INTERVAL_MS,
		refetchInterval: KEY_DEPTH_REFRESH_INTERVAL_MS,
		retry: false,
	});
}

export default useKeyDepth;
