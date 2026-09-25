import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
	notificationService,
	type Notification,
	type NotificationsResponse,
} from '@/services/notification.service';

const MAX_DROPDOWN_NOTIFICATIONS = 5;

export interface UseNotificationsResult {
	/** All notifications, sorted newest first. */
	notifications: Notification[];
	/** Up to five most recent notifications for the dropdown. */
	recent: Notification[];
	/** Total number of unread notifications. */
	unreadCount: number;
	isLoading: boolean;
	isError: boolean;
	/** Mark a single notification as read by its id. */
	markAsRead: (notificationId: string) => void;
	/** Mark all notifications as read and clear unread count. */
	markAllAsRead: () => void;
}

/**
 * Fetches the current user's notifications, polls every 60s, and exposes helpers
 * to mark individual or all items as read with optimistic updates.
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
		refetchInterval: 60000,
	});

	const { mutate: markAsRead } = useMutation({
		mutationFn: (notificationId: string) =>
			notificationService.markAsRead(notificationId),
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

	const { mutate: markAllAsRead } = useMutation({
		mutationFn: () => notificationService.markAllAsRead(userId),
		onMutate: async () => {
			await queryClient.cancelQueries({ queryKey });

			const previous =
				queryClient.getQueryData<NotificationsResponse>(queryKey);

			if (previous) {
				queryClient.setQueryData<NotificationsResponse>(queryKey, {
					notifications: previous.notifications.map(n => ({
						...n,
						read: true,
					})),
					unreadCount: 0,
				});
			}

			return { previous };
		},
		onError: (_err, _vars, context) => {
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

	const rawNotifications = data?.notifications ?? [];
	// Sort newest first by createdAt timestamp
	const notifications = [...rawNotifications].sort(
		(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
	);
	const recent = notifications.slice(0, MAX_DROPDOWN_NOTIFICATIONS);

	return {
		notifications,
		recent,
		unreadCount: data?.unreadCount ?? 0,
		isLoading,
		isError,
		markAsRead,
		markAllAsRead,
	};
}
