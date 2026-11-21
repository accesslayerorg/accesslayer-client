import { useQuery } from '@tanstack/react-query';
import { statusService } from '@/services/status.service';
import { queryKeys } from '@/lib/queryKeys';

/** Auto-refresh interval required by #1051 — the page polls every 60 seconds. */
export const STATUS_REFETCH_INTERVAL_MS = 60 * 1_000;

/** Go stale just before the poll fires so the refresh lands on schedule. */
const STATUS_STALE_TIME_MS = 55 * 1_000;

/**
 * Polls the public platform status snapshot (`GET /status`) every 60
 * seconds, refreshing the health grid, uptime history, and incident log
 * without a page reload (#1051).
 */
export function usePlatformStatus() {
	return useQuery({
		queryKey: queryKeys.status.platform(),
		queryFn: () => statusService.getPlatformStatus(),
		staleTime: STATUS_STALE_TIME_MS,
		refetchInterval: STATUS_REFETCH_INTERVAL_MS,
	});
}
