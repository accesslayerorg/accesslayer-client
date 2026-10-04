import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { creatorProfileService } from '@/services/creatorProfile.service';

/** How long a fetched public creator profile stays fresh (30 seconds). */
export const CREATOR_PUBLIC_PROFILE_STALE_TIME_MS = 30_000;

/**
 * Public creator profile keyed by the creator's wallet address (#1054).
 *
 * A missing creator surfaces as the query's error (`ApiError` with status
 * 404) so the page can render its not-found state. Retries are disabled so an
 * address that has deployed no keys is not hammered on every visit.
 */
export function useCreatorPublicProfile(address: string) {
	return useQuery({
		queryKey: queryKeys.creators.publicProfile(address),
		queryFn: () => creatorProfileService.getCreatorPublicProfile(address),
		enabled: Boolean(address.trim()),
		staleTime: CREATOR_PUBLIC_PROFILE_STALE_TIME_MS,
		retry: false,
	});
}
