import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
	analyticsService,
	type ProtocolTimeRange,
} from '@/services/analytics.service';

export const PROTOCOL_ANALYTICS_REFETCH_INTERVAL_MS = 60_000; // 60 seconds

export interface UseProtocolAnalyticsOptions {
	refetchInterval?: number;
}

/**
 * Fetches protocol-wide analytics (TVL, cumulative volume, active keys,
 * unique traders, history points, and top keys by volume) for a time range.
 * Automatically refreshes every 60 seconds by default.
 */
export function useProtocolAnalytics(
	range: ProtocolTimeRange = '30d',
	options: UseProtocolAnalyticsOptions = {}
) {
	const { refetchInterval = PROTOCOL_ANALYTICS_REFETCH_INTERVAL_MS } = options;

	return useQuery({
		queryKey: queryKeys.protocolAnalytics.data(range),
		queryFn: () => analyticsService.getProtocolAnalytics(range),
		refetchInterval,
		refetchIntervalInBackground: false,
		staleTime: 15_000,
	});
}
