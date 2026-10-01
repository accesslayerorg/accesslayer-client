import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { courseService } from '@/services/course.service';

/** How often key stats are refreshed from the aggregation endpoint (#952). */
export const KEY_STATS_REFRESH_INTERVAL_MS = 30_000;

export function useKeyStats(keyId: string) {
	return useQuery({
		queryKey: queryKeys.creators.stats(keyId),
		queryFn: () => courseService.getKeyStats(keyId),
		enabled: !!keyId,
		staleTime: KEY_STATS_REFRESH_INTERVAL_MS,
		refetchInterval: KEY_STATS_REFRESH_INTERVAL_MS,
		retry: false,
	});
}
