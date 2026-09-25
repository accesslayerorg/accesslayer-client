import { useQuery } from '@tanstack/react-query';
import { courseService, type Course } from '@/services/course.service';
import { queryKeys } from '@/lib/queryKeys';

/** How long a fetched creator profile is considered fresh (30 seconds). */
export const CREATOR_PROFILE_STALE_TIME_MS = 30_000;

/**
 * Fetches a single creator profile by ID via React Query.
 *
 * Data is considered fresh for {@link CREATOR_PROFILE_STALE_TIME_MS}ms,
 * matching the TTL used by the underlying `courseService` cache layer.
 * Subsequent mounts within that window are served from the React Query
 * cache without a network request.
 *
 * @param creatorId - The creator's unique identifier.
 */
export function useCreatorProfileQuery(creatorId: string) {
	return useQuery<Course>({
		queryKey: queryKeys.creatorProfile.byId(creatorId),
		queryFn: () => courseService.getCourse(creatorId),
		staleTime: CREATOR_PROFILE_STALE_TIME_MS,
		enabled: Boolean(creatorId),
	});
}
