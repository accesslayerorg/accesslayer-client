import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
	GOVERNANCE_EVENTS_PAGE_SIZE,
	governanceService,
} from '@/services/governance.service';
import { queryKeys } from '@/lib/queryKeys';
import type { GovernanceEventType } from '@/types/governance';

/**
 * Cursor-paginated feed of privileged governance events (#1351).
 *
 * Pass a type to limit the feed to one kind of event; omit it (or pass
 * `undefined`) for every event. Each type gets its own cache entry, so
 * switching filters restarts pagination from the first page.
 *
 * Public data — no wallet connection is needed.
 */
export function useGovernanceEvents(type?: GovernanceEventType) {
	return useInfiniteQuery({
		queryKey: queryKeys.governance.events(type),
		queryFn: ({ pageParam }) =>
			governanceService.getGovernanceEvents({
				type,
				cursor: pageParam,
				limit: GOVERNANCE_EVENTS_PAGE_SIZE,
			}),
		initialPageParam: null as string | null,
		getNextPageParam: lastPage => lastPage.nextCursor ?? undefined,
		staleTime: 30_000,
	});
}

/**
 * Current protocol admin and any pending admin transfer (#1351).
 * Refetches every 30 s so an accepted or expired transfer shows up
 * without a manual reload.
 */
export function useGovernanceAdmin() {
	return useQuery({
		queryKey: queryKeys.governance.admin(),
		queryFn: () => governanceService.getGovernanceAdmin(),
		staleTime: 15_000,
		refetchInterval: 30_000,
	});
}
