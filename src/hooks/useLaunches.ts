import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useNowMs } from '@/hooks/useNowMs';
import { queryKeys } from '@/lib/queryKeys';
import { courseService } from '@/services/course.service';
import {
	filterLaunches,
	toLaunches,
	type Launch,
	type LaunchTab,
} from '@/utils/launch.utils';

export const LAUNCH_POLL_INTERVAL_MS = 60_000;

export interface UseLaunchesOptions {
	pollIntervalMs?: number | false;
}

export function useLaunches(tab: LaunchTab = 'live', options?: UseLaunchesOptions) {
	const nowMs = useNowMs();
	const pollIntervalMs = options?.pollIntervalMs ?? LAUNCH_POLL_INTERVAL_MS;

	const query = useQuery({
		queryKey: queryKeys.launches.all(),
		queryFn: () => courseService.getCourses({}),
		staleTime: pollIntervalMs === false ? Infinity : pollIntervalMs,
		refetchInterval: pollIntervalMs === false ? false : pollIntervalMs,
	});

	const allLaunches = useMemo<Launch[]>(
		() => toLaunches(query.data ?? [], nowMs),
		[query.data, nowMs]
	);

	const launches = useMemo<Launch[]>(
		() => filterLaunches(allLaunches, tab, nowMs),
		[allLaunches, tab, nowMs]
	);

	return {
		launches,
		allLaunches,
		nowMs,
		isLoading: query.isLoading,
		isError: query.isError,
		error: query.error,
		refetch: query.refetch,
	};
}
