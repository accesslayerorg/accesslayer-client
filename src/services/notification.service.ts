import { BaseApiService, type APIResponse } from './api.service';
import { alertService } from './alert.service';
import { courseService } from './course.service';
import { STROOPS_PER_XLM } from '@/constants/stellar';

/** The kind of event that generated a notification. */
export type NotificationType =
	| 'trade_completed'
	| 'lockup_expiring'
	| 'price_moved'
	| 'new_follower'
	| 'key_purchase'
	| 'price_milestone'
	| 'price_alert';

/** A single notification entry returned from the API. */
export interface Notification {
	id: string;
	type: NotificationType;
	message: string;
	/** ISO 8601 timestamp when the notification was created. */
	createdAt: string;
	read: boolean;
	/** Client-side path to navigate to when this notification is clicked. */
	href: string;
}

/** Shape of the API response for a notifications list request. */
export interface NotificationsResponse {
	notifications: Notification[];
	unreadCount: number;
}

// In-memory cache of triggered alert IDs to avoid duplicate notifications within session
const triggeredAlertIdsCache = new Set<string>();

export function clearTriggeredAlertsCache(): void {
	triggeredAlertIdsCache.clear();
}

export async function processPriceAlerts(
	userId: string,
	existingNotifications: Notification[] = []
): Promise<{ newNotifications: Notification[]; triggeredAlertIds: string[] }> {
	if (!userId) return { newNotifications: [], triggeredAlertIds: [] };

	try {
		const activeAlerts = await alertService.getActiveAlerts(userId);
		if (!activeAlerts || activeAlerts.length === 0) {
			return { newNotifications: [], triggeredAlertIds: [] };
		}

		const newNotifications: Notification[] = [];
		const triggeredAlertIds: string[] = [];

		for (const alert of activeAlerts) {
			if (alert.triggered) {
				triggeredAlertIdsCache.add(alert.id);
				continue;
			}
			if (triggeredAlertIdsCache.has(alert.id)) {
				continue;
			}
			const notificationId = `price-alert-${alert.id}`;
			if (existingNotifications.some(n => n.id === notificationId || n.id === alert.id)) {
				triggeredAlertIdsCache.add(alert.id);
				continue;
			}

			try {
				const course = await courseService.getCourse(alert.keyId);
				if (!course) continue;

				const currentXlm =
					course.priceStroops != null
						? course.priceStroops / STROOPS_PER_XLM
						: (course.price ?? 0);

				const isStroopsTarget = alert.targetPrice >= 100_000;
				const targetXlm = isStroopsTarget
					? alert.targetPrice / STROOPS_PER_XLM
					: alert.targetPrice;

				const direction = alert.direction;
				const isCrossed =
					(direction === 'above' && currentXlm >= targetXlm) ||
					(direction === 'below' && currentXlm <= targetXlm);

				if (isCrossed) {
					// Mark alert as triggered on backend via PATCH /alerts/:alertId/triggered
					await alertService.markAlertTriggered(alert.id);
					triggeredAlertIdsCache.add(alert.id);
					triggeredAlertIds.push(alert.id);

					const keyName =
						alert.keyName ||
						alert.keyTitle ||
						course.name ||
						course.title ||
						'Key';

					const notification: Notification = {
						id: notificationId,
						type: 'price_alert',
						message: `${keyName} price is now ${currentXlm} XLM (${direction} target of ${targetXlm} XLM)`,
						createdAt: new Date().toISOString(),
						read: false,
						href: `/creator/${alert.keyId}`,
					};

					newNotifications.push(notification);
				}
			} catch (err) {
				console.error(`Error checking price alert ${alert.id}:`, err);
			}
		}

		return { newNotifications, triggeredAlertIds };
	} catch (err) {
		console.error('Error processing price alerts:', err);
		return { newNotifications: [], triggeredAlertIds: [] };
	}
}

class NotificationService extends BaseApiService {
	/** Fetch the current user's notifications — GET /notifications */
	async getNotifications(userId: string): Promise<NotificationsResponse> {
		try {
			const response = await this.api.get<
				APIResponse<NotificationsResponse>
			>(`/notifications`, { params: { userId } });

			const baseData = response.data?.data ?? { notifications: [], unreadCount: 0 };
			const baseNotifications = baseData.notifications ?? [];

			// Process active price alerts on poll
			const { newNotifications } = await processPriceAlerts(userId, baseNotifications);

			if (newNotifications.length > 0) {
				const merged = [...newNotifications, ...baseNotifications];
				const unreadCount = (baseData.unreadCount ?? 0) + newNotifications.length;
				return { notifications: merged, unreadCount };
			}

			return baseData;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/** Mark a single notification as read — PATCH /notifications/:id/read */
	async markAsRead(notificationId: string): Promise<void> {
		try {
			await this.api.patch(`/notifications/${notificationId}/read`);
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/** Mark all notifications as read — PATCH /notifications/read-all */
	async markAllAsRead(userId: string): Promise<void> {
		try {
			await this.api.patch(`/notifications/read-all`, { userId });
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const notificationService = new NotificationService();
