import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
	fetchAnnouncementContent,
	fetchAnnouncementsPage,
} from '@/services/announcements.service';
import type { AnnouncementPage } from '@/utils/announcements.utils';

/**
 * Paginated creator announcements (#1175). `fetchNextPage()` loads older posts.
 */
export function useAnnouncements(creatorId: string, pageSize = 10) {
	return useInfiniteQuery<AnnouncementPage>({
		queryKey: ['announcements', creatorId, pageSize],
		queryFn: ({ pageParam }) =>
			fetchAnnouncementsPage(creatorId, (pageParam as number) ?? 1, pageSize),
		initialPageParam: 1,
		getNextPageParam: lastPage => lastPage.nextPage,
		enabled: !!creatorId,
	});
}

/**
 * Full announcement body, fetched from IPFS only when the entry is expanded
 * (#1175). `enabled` is toggled by the item's open state.
 */
export function useAnnouncementContent(
	announcementId: string,
	enabled: boolean
) {
	return useQuery<string>({
		queryKey: ['announcements', announcementId, 'content'],
		queryFn: () => fetchAnnouncementContent(announcementId),
		enabled: enabled && !!announcementId,
		staleTime: 5 * 60_000,
	});
}
