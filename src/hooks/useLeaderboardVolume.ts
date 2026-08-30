import { useQuery } from '@tanstack/react-query';
import { leaderboardService } from '@/services/leaderboard.service';
import { queryKeys } from '@/lib/queryKeys';

/** 5 minutes stale time as specified in the issue. */
const LEADERBOARD_STALE_TIME_MS = 5 * 60 * 1000;

export function useLeaderboardVolume() {
	return useQuery({
		queryKey: queryKeys.leaderboard.volume(),
		queryFn: () => leaderboardService.getVolumeLeaderboard(),
		staleTime: LEADERBOARD_STALE_TIME_MS,
	});
}
