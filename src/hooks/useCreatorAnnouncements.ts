import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
	announcementService,
	type CreatorAnnouncement,
} from '@/services/announcement.service';

/**
 * Announcements a creator has posted, newest first (#1159).
 * Keyed by creator id so the list refreshes after a successful publish.
 */
export function useCreatorAnnouncements(creatorId: string | undefined) {
	const query = useQuery({
		queryKey: queryKeys.creators.announcements(creatorId ?? ''),
		queryFn: () => announcementService.getCreatorAnnouncements(creatorId ?? ''),
		enabled: Boolean(creatorId),
	});

	const announcements: CreatorAnnouncement[] = query.data ?? [];

	return {
		announcements,
		isLoading: query.isLoading,
		isError: query.isError,
	};
}
