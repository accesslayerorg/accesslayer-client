import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import type { CreatorActivityTrade } from '@/services/creatorActivity.service';

export interface CreatorActivityFeedResult {
	trades: CreatorActivityTrade[];
	isLoading: boolean;
	isError: boolean;
}

/**
 * Fetches a creator's public activity feed via React Query.
 * Query key: ['creators', creatorId, 'activity']
 *
 * The queryFn is injected as a parameter (matching useCreatorHolderCount's
 * convention) so tests can supply a mock without module-level vi.mock()
 * patching.
 */
export function useCreatorActivityFeed(
	creatorId: string,
	fetchCreatorActivity: (id: string) => Promise<CreatorActivityTrade[]>
): CreatorActivityFeedResult {
	const { data, isLoading, isError } = useQuery({
		queryKey: queryKeys.creators.activity(creatorId),
		queryFn: () => fetchCreatorActivity(creatorId),
		enabled: !!creatorId,
	});

	return {
		trades: data ?? [],
		isLoading,
		isError,
	};
}
