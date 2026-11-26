import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
	fetchDistributionHistory,
	fetchDistributionOverview,
	type DistributionType,
} from '@/services/distributionHistory.service';

const DISTRIBUTION_STALE_TIME_MS = 30_000;

/**
 * Aggregated distribution totals and the last-12-months series that power the
 * running total card and chart (#1259).
 */
export function useDistributionOverview(wallet: string | undefined) {
	return useQuery({
		queryKey: queryKeys.distributions.overview(wallet ?? ''),
		queryFn: () => fetchDistributionOverview(wallet as string),
		enabled: Boolean(wallet),
		staleTime: DISTRIBUTION_STALE_TIME_MS,
	});
}

/**
 * Paginated distribution history for a single distribution type.
 * `page` is 1-indexed; the previous page stays visible while the next loads.
 */
export function useDistributionHistory(
	wallet: string | undefined,
	type: DistributionType,
	page: number
) {
	return useQuery({
		queryKey: queryKeys.distributions.history(wallet ?? '', type, page),
		queryFn: () => fetchDistributionHistory(wallet as string, type, page),
		enabled: Boolean(wallet),
		placeholderData: keepPreviousData,
		staleTime: DISTRIBUTION_STALE_TIME_MS,
	});
}
