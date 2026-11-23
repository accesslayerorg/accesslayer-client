import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
	keyLeaderboardService,
	type KeyHolderLeaderboardEntry,
	type KeyHolderLeaderboardMetric,
} from '@/services/keyLeaderboard.service';

interface UseKeyHolderLeaderboardOptions {
	enabled?: boolean;
	excludeContracts?: boolean;
}

export function recomputeLeaderboard(
	entries: KeyHolderLeaderboardEntry[],
	excludeContracts: boolean
): KeyHolderLeaderboardEntry[] {
	const filtered = excludeContracts
		? entries.filter((entry) => !entry.isContract)
		: entries;

	const totalSupply = filtered.reduce((sum, entry) => sum + entry.balance, 0);

	return filtered
		.slice()
		.sort((a, b) => b.balance - a.balance)
		.map((entry, index) => ({
			...entry,
			rank: index + 1,
			supplyShare: totalSupply > 0 ? entry.balance / totalSupply : 0,
		}));
}

export function useKeyHolderLeaderboard(
	keyId: string,
	metric: KeyHolderLeaderboardMetric,
	options: UseKeyHolderLeaderboardOptions = {}
) {
	const excludeContracts = options.excludeContracts ?? false;

	return useQuery<KeyHolderLeaderboardEntry[]>({
		queryKey: queryKeys.keyLeaderboard.holders(keyId, metric),
		queryFn: () => keyLeaderboardService.getKeyHolderLeaderboard(keyId, metric),
		enabled: Boolean(keyId) && (options.enabled ?? true),
		staleTime: 30_000,
		select: (entries) => recomputeLeaderboard(entries, excludeContracts),
	});
}
