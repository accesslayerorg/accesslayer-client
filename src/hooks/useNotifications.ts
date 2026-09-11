import { useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
	notificationService,
	type Notification,
	type NotificationsResponse,
} from '@/services/notification.service';
import { alertService, type PriceAlert } from '@/services/alert.service';

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

export interface UseNotificationsOptions {
	fetchNotifications?: (id: string) => Promise<NotificationsResponse>;
	getActiveAlerts?: (id: string) => Promise<PriceAlert[]>;
	getKeyPrice?: (keyId: string) => Promise<number>;
	markAlertTriggered?: (alertId: string) => Promise<void>;
}

/**
 * Checks active price alerts for the user against latest key prices.
 * Returns newly generated price_alert notifications for crossed thresholds,
 * marks triggered alerts on the backend, and ignores already triggered/active alerts.
 */
export async function checkPriceAlerts(
	userId: string,
	options?: {
		getActiveAlerts?: (id: string) => Promise<PriceAlert[]>;
		getKeyPrice?: (keyId: string) => Promise<number>;
		markAlertTriggered?: (alertId: string) => Promise<void>;
		triggeredSet?: Set<string>;
	}
): Promise<Notification[]> {
	const getAlerts =
		options?.getActiveAlerts ?? (id => alertService.getActiveAlerts(id));
	const getPrice =
		options?.getKeyPrice ?? (keyId => alertService.getKeyPrice(keyId));
	const markTriggered =
		options?.markAlertTriggered ??
		(alertId => alertService.markAlertTriggered(alertId));
	const triggered = options?.triggeredSet ?? new Set<string>();

	const newNotifications: Notification[] = [];

	try {
		const alerts = await getAlerts(userId);
		for (const alert of alerts) {
			if (alert.triggered || triggered.has(alert.id)) {
				continue;
			}

			try {
				const currentPrice = await getPrice(alert.keyId);
				let crossed = false;

				if (
					alert.direction === 'above' &&
					currentPrice >= alert.targetPrice
				) {
					crossed = true;
				} else if (
					alert.direction === 'below' &&
					currentPrice <= alert.targetPrice
				) {
					crossed = true;
				}

				if (crossed) {
					triggered.add(alert.id);
					try {
						await markTriggered(alert.id);
					} catch {
						// Backend update error shouldn't crash the loop
					}

					newNotifications.push({
						id: `price_alert_${alert.id}`,
						type: 'price_alert',
						message: `${alert.keyName} is now ${alert.direction} target price (${alert.targetPrice} ETH): current price is ${currentPrice} ETH`,
						createdAt: new Date().toISOString(),
						read: false,
						href: `/key/${alert.keyId}`,
					});
				}
			} catch {
				// Continue evaluating remaining alerts if one key price fetch fails
			}
		}
	} catch {
		// Suppress alerts fetch failure
	}

	return newNotifications;
}

/**
 * Fetches the current user's notifications, polls every 60s, checks active price alerts
 * against live prices, and exposes helpers to mark individual or all items as read.
 */
export function useNotifications(
	userId: string,
	fetchNotificationsOrOptions?:
		((id: string) => Promise<NotificationsResponse>) | UseNotificationsOptions
): UseNotificationsResult {
	const queryClient = useQueryClient();
	const queryKey = queryKeys.notifications.list(userId);
	const triggeredAlertsRef = useRef<Set<string>>(new Set());

	const options: UseNotificationsOptions =
		typeof fetchNotificationsOrOptions === 'function'
			? { fetchNotifications: fetchNotificationsOrOptions }
			: (fetchNotificationsOrOptions ?? {});

	const fetchNotifications =
		options.fetchNotifications ??
		(id => notificationService.getNotifications(id));
	const getActiveAlerts =
		options.getActiveAlerts ?? (id => alertService.getActiveAlerts(id));
	const getKeyPrice =
		options.getKeyPrice ?? (keyId => alertService.getKeyPrice(keyId));
	const markAlertTriggered =
		options.markAlertTriggered ??
		(alertId => alertService.markAlertTriggered(alertId));

	const { data, isLoading, isError } = useQuery({
		queryKey,
		queryFn: async () => {
			const baseResponse = await fetchNotifications(userId);
			const notifications = [...(baseResponse.notifications ?? [])];
			let unreadCount = baseResponse.unreadCount ?? 0;

			const priceAlertNotifications = await checkPriceAlerts(userId, {
				getActiveAlerts,
				getKeyPrice,
				markAlertTriggered,
				triggeredSet: triggeredAlertsRef.current,
			});

			for (const alertNotif of priceAlertNotifications) {
				if (!notifications.some(n => n.id === alertNotif.id)) {
					notifications.unshift(alertNotif);
					unreadCount += 1;
				}
			}

			return {
				notifications,
				unreadCount,
			};
		},
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
		(a, b) =>
			new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
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
