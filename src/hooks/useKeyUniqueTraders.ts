import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { courseService } from '@/services/course.service';

/** How often the unique trader count is refreshed (#1020). */
export const KEY_UNIQUE_TRADERS_REFRESH_INTERVAL_MS = 5 * 60_000;

export function useKeyUniqueTraders(keyId: string) {
	return useQuery({
		queryKey: queryKeys.creators.uniqueTraders(keyId),
		queryFn: () => courseService.getKeyUniqueTraders(keyId),
		enabled: !!keyId,
		staleTime: KEY_UNIQUE_TRADERS_REFRESH_INTERVAL_MS,
		refetchInterval: KEY_UNIQUE_TRADERS_REFRESH_INTERVAL_MS,
		retry: false,
	});
}
