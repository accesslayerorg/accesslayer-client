import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
	analyticsService,
	type LeaderboardMetric,
	type KeyLeaderboardEntry,
} from '@/services/analytics.service';

export interface UseKeyDiscoveryLeaderboardOptions {
	enabled?: boolean;
	refetchInterval?: number | false;
}

/**
 * Hook to fetch top performing creator keys discovery leaderboard (#1206).
 * Ranked by volume, holders, or reputation score.
 */
export function useKeyDiscoveryLeaderboard(
	metric: LeaderboardMetric = 'volume',
	options: UseKeyDiscoveryLeaderboardOptions = {}
) {
	return useQuery<KeyLeaderboardEntry[]>({
		queryKey: queryKeys.keyLeaderboard.byMetric(metric),
		queryFn: () => analyticsService.getKeyDiscoveryLeaderboard(metric),
		enabled: options.enabled ?? true,
		refetchInterval: options.refetchInterval ?? false,
		staleTime: 30_000,
	});
}
