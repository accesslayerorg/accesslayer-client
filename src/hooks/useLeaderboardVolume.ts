import { useQuery } from '@tanstack/react-query';
import { leaderboardService, type VolumeWindow } from '@/services/leaderboard.service';
import { queryKeys } from '@/lib/queryKeys';

/** Stale after 55 s so a background refetch is triggered before the 60 s UI badge ticks. */
const LEADERBOARD_STALE_TIME_MS = 55 * 1_000;
/** Auto-refresh the leaderboard every 60 seconds as required by #929. */
const LEADERBOARD_REFETCH_INTERVAL_MS = 60 * 1_000;

export function useLeaderboardVolume(window: VolumeWindow = '24h') {
	return useQuery({
		queryKey: queryKeys.leaderboard.volume(window),
		queryFn: () => leaderboardService.getVolumeLeaderboard(window),
		staleTime: LEADERBOARD_STALE_TIME_MS,
		refetchInterval: LEADERBOARD_REFETCH_INTERVAL_MS,
	});
}
