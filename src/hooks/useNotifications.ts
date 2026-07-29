import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
	notificationService,
	type Notification,
	type NotificationsResponse,
} from '@/services/notification.service';

const MAX_DROPDOWN_NOTIFICATIONS = 5;

export interface UseNotificationsResult {
	/** Up to five most recent notifications for the dropdown. */
	recent: Notification[];
	/** Total number of unread notifications. */
	unreadCount: number;
	isLoading: boolean;
	isError: boolean;
	/** Mark a single notification as read by its id. */
	markAsRead: (notificationId: string) => void;
}

/**
 * Fetches the current user's notifications and exposes a helper to mark
 * individual items as read with an optimistic update.
 *
 * The queryFn is injected so tests can supply a stub without module-level
 * patching (matches the pattern used in `useCreatorActivityFeed`).
 */
export function useNotifications(
	userId: string,
	fetchNotifications: (
		id: string
	) => Promise<NotificationsResponse> = id =>
		notificationService.getNotifications(id)
): UseNotificationsResult {
	const queryClient = useQueryClient();
	const queryKey = queryKeys.notifications.list(userId);

	const { data, isLoading, isError } = useQuery({
		queryKey,
		queryFn: () => fetchNotifications(userId),
		enabled: !!userId,
	});

	const { mutate: markAsRead } = useMutation({
		mutationFn: (notificationId: string) =>
			notificationService.markAsRead(notificationId),
		// Optimistic update: flip the `read` flag and decrement the count
		// so the badge responds instantly without waiting for the server.
		onMutate: async (notificationId: string) => {
			await queryClient.cancelQueries({ queryKey });

			const previous =
				queryClient.getQueryData<NotificationsResponse>(queryKey);

			if (previous) {
				queryClient.setQueryData<NotificationsResponse>(queryKey, {
					notifications: previous.notifications.map(n =>
						n.id === notificationId ? { ...n, read: true } : n
					),
					unreadCount: Math.max(0, previous.unreadCount - 1),
				});
			}

			return { previous };
		},
		onError: (_err, _id, context) => {
			// Roll back the optimistic update on failure.
			if (context?.previous) {
				queryClient.setQueryData<NotificationsResponse>(
					queryKey,
					context.previous
				);
			}
		},
		onSettled: () => {
			void queryClient.invalidateQueries({ queryKey });
		},
	});

	const allNotifications = data?.notifications ?? [];
	const recent = allNotifications.slice(0, MAX_DROPDOWN_NOTIFICATIONS);

	return {
		recent,
		unreadCount: data?.unreadCount ?? 0,
		isLoading,
		isError,
		markAsRead,
	};
}
