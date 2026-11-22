import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
	keyLeaderboardService,
	type KeyHolderLeaderboardEntry,
	type KeyHolderLeaderboardMetric,
} from '@/services/keyLeaderboard.service';

interface UseKeyHolderLeaderboardOptions {
	enabled?: boolean;
}

export function useKeyHolderLeaderboard(
	keyId: string,
	metric: KeyHolderLeaderboardMetric,
	options: UseKeyHolderLeaderboardOptions = {}
) {
	return useQuery<KeyHolderLeaderboardEntry[]>({
		queryKey: queryKeys.keyLeaderboard.holders(keyId, metric),
		queryFn: () => keyLeaderboardService.getKeyHolderLeaderboard(keyId, metric),
		enabled: Boolean(keyId) && (options.enabled ?? true),
		staleTime: 30_000,
	});
}
