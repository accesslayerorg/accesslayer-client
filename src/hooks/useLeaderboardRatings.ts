import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { leaderboardService } from '@/services/leaderboard.service';

/** Stale after 4m55s so a background refresh happens before the 5 minute badge rolls over. */
const LEADERBOARD_STALE_TIME_MS = 4 * 60 * 1_000 + 55 * 1_000;
/** Ratings leaderboard refresh cadence required by #982. */
const LEADERBOARD_REFETCH_INTERVAL_MS = 5 * 60 * 1_000;

interface UseLeaderboardRatingsOptions {
        enabled?: boolean;
}

export function useLeaderboardRatings(
        options: UseLeaderboardRatingsOptions = {}
) {
        return useQuery({
                queryKey: queryKeys.leaderboard.ratings(),
                queryFn: () => leaderboardService.getRatingsLeaderboard(),
                staleTime: LEADERBOARD_STALE_TIME_MS,
                refetchInterval: LEADERBOARD_REFETCH_INTERVAL_MS,
                enabled: options.enabled ?? true,
        });
}
