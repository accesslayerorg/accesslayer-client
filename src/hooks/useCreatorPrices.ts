import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { courseService } from '@/services/course.service';

/**
 * All creator keys with their current bonding-curve prices (#921).
 *
 * The profile page merges these prices into cached wallet holdings so every
 * held key and staking position can be valued at its current on-chain price.
 * The key is nested under `creators` so a completed trade — which invalidates
 * the `creators` family — also refreshes these prices.
 */
export function useCreatorPrices() {
	return useQuery({
		queryKey: queryKeys.creators.prices(),
		queryFn: () => courseService.getCourses(),
		staleTime: 30_000,
	});
}
