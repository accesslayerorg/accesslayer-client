// src/services/notification.service.ts
import { BaseApiService, type APIResponse } from './api.service';

/** The kind of event that generated a notification. */
export type NotificationType =
	| 'trade_completed'
	| 'lockup_expiring'
	| 'price_moved'
	| 'new_follower'
	| 'key_purchase'
	| 'price_milestone';

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

class NotificationService extends BaseApiService {
	/** Fetch the current user's notifications — GET /notifications */
	async getNotifications(userId: string): Promise<NotificationsResponse> {
		try {
			const response = await this.api.get<
				APIResponse<NotificationsResponse>
			>(`/notifications`, { params: { userId } });
			return response.data.data;
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
