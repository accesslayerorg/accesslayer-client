import { useQuery } from '@tanstack/react-query';
import { leaderboardService } from '@/services/leaderboard.service';
import { queryKeys } from '@/lib/queryKeys';

/** Refresh trending creators every 5 minutes. */
const TRENDING_CREATORS_REFETCH_INTERVAL_MS = 5 * 60 * 1_000;
/** Stale after 4 minutes 55 seconds so a background refetch is triggered before the 5-minute refresh. */
const TRENDING_CREATORS_STALE_TIME_MS = (5 * 60 - 5) * 1_000;
/** Display only the top 5 trending creators. */
const TRENDING_CREATORS_LIMIT = 5;

export interface UseTrendingCreatorsResult {
	creators: ReturnType<typeof leaderboardService.getVolumeLeaderboard> extends Promise<infer T> ? T : never;
	isLoading: boolean;
	isError: boolean;
	error: Error | null;
}

export function useTrendingCreators() {
	const { data, isLoading, isError, error } = useQuery({
		queryKey: queryKeys.leaderboard.volume('24h'),
		queryFn: () => leaderboardService.getVolumeLeaderboard('24h'),
		staleTime: TRENDING_CREATORS_STALE_TIME_MS,
		refetchInterval: TRENDING_CREATORS_REFETCH_INTERVAL_MS,
	});

	return {
		creators: (data ?? []).slice(0, TRENDING_CREATORS_LIMIT),
		isLoading,
		isError,
		error: error instanceof Error ? error : null,
	};
}
