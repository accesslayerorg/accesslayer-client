import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { courseService, type PerformanceBond } from '@/services/course.service';

/** How often performance bond status is refreshed in milliseconds (#975). */
export const PERFORMANCE_BOND_REFRESH_INTERVAL_MS = 60_000;

/**
 * Hook to fetch performance bond status for a creator key (#975).
 *
 * Returns performance bond data, loading state, and error status.
 * Enabled only when keyId is provided.
 */
export function usePerformanceBond(keyId: string | undefined) {
	return useQuery<PerformanceBond | null>({
		queryKey: queryKeys.creators.performanceBond(keyId ?? ''),
		queryFn: () => courseService.getPerformanceBond(keyId!),
		enabled: Boolean(keyId),
		staleTime: PERFORMANCE_BOND_REFRESH_INTERVAL_MS,
		retry: false,
	});
}
