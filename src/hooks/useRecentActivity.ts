import { useQuery } from '@tanstack/react-query';
import { globalActivityService, type GlobalActivityTrade } from '@/services/globalActivity.service';
import { queryKeys } from '@/lib/queryKeys';

export const RECENT_ACTIVITY_POLL_INTERVAL_MS = 60_000; // 60 seconds
export const RECENT_ACTIVITY_DISPLAY_LIMIT = 5;

export interface UseRecentActivityResult {
	trades: GlobalActivityTrade[];
	isLoading: boolean;
	isError: boolean;
	error: Error | null;
	refetch: () => void;
}

export function useRecentActivity(
	limit = RECENT_ACTIVITY_DISPLAY_LIMIT
): UseRecentActivityResult {
	const { data, isLoading, isError, error, refetch } = useQuery({
		queryKey: queryKeys.activity.recent(limit),
		queryFn: () => globalActivityService.getRecentActivity(limit),
		refetchInterval: RECENT_ACTIVITY_POLL_INTERVAL_MS,
		staleTime: 30_000, // 30 seconds
	});

	return {
		trades: data ?? [],
		isLoading,
		isError,
		error: error instanceof Error ? error : null,
		refetch,
	};
}
