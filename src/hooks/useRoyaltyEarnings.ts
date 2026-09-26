import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { royaltyEarningsService } from '@/services/royaltyEarnings.service';
import type { RoyaltyEarnings } from '@/services/royaltyEarnings.service';

/**
 * How often the earnings section refreshes in the background (issue #987:
 * "Earnings update on 60s refresh"). Matches useNotifications' 60s cadence.
 */
export const ROYALTY_EARNINGS_REFETCH_INTERVAL_MS = 60_000;

export interface UseRoyaltyEarningsOptions {
	/**
	 * Override the query function — used by tests to inject mock earnings
	 * without module-level vi.mock() patching (matches useCreatorActivityFeed's
	 * convention).
	 */
	queryFn?: () => Promise<RoyaltyEarnings>;
}

/**
 * Fetches a creator's royalty earnings, polling every 60 seconds.
 * Query key: ['creators', creatorId, 'royalties']
 */
export function useRoyaltyEarnings(
	creatorId: string,
	options: UseRoyaltyEarningsOptions = {}
) {
	const fetchEarnings =
		options.queryFn ?? (() => royaltyEarningsService.getRoyaltyEarnings(creatorId));

	return useQuery({
		queryKey: queryKeys.creators.royalties(creatorId),
		queryFn: fetchEarnings,
		enabled: !!creatorId,
		refetchInterval: ROYALTY_EARNINGS_REFETCH_INTERVAL_MS,
	});
}
