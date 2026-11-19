import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { fetchPortfolioHistory } from '@/services/portfolioHistory.service';
import type { PortfolioHistoryRange } from '@/utils/portfolioHistory.utils';

/**
 * Portfolio value history for a wallet (#1052).
 *
 * Fetches the full series once and lets `PortfolioPerformanceChart` slice it by
 * range, so switching between 7d/30d/90d/all is instant and never re-hits the
 * network. Pass a narrower `range` only when the caller genuinely wants the
 * server to pre-trim the series.
 */
export function usePortfolioHistory(
	address: string,
	range: PortfolioHistoryRange = 'all'
) {
	return useQuery({
		queryKey: queryKeys.wallet.portfolioHistory(address, range),
		queryFn: () => fetchPortfolioHistory(address, range),
		enabled: !!address,
	});
}
