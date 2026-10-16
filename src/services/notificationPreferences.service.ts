// src/services/notificationPreferences.service.ts
import { BaseApiService, type APIResponse } from './api.service';

/** Platform events a user can opt in or out of being notified about. */
export const NOTIFICATION_PREFERENCE_TYPES = [
	'price_alert',
	'milestone_reached',
	'vesting_cliff',
	'staking_reward',
	'governance_vote',
	'referral_earned',
	'key_deprecated',
] as const;

export type NotificationPreferenceType =
	(typeof NOTIFICATION_PREFERENCE_TYPES)[number];

/** Delivery channels each notification type can be routed to. */
export const NOTIFICATION_CHANNELS = ['email', 'inApp'] as const;

export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export type ChannelPreferences = Record<NotificationChannel, boolean>;

export type NotificationPreferences = Record<
	NotificationPreferenceType,
	ChannelPreferences
>;

class NotificationPreferencesService extends BaseApiService {
	/** Fetch the current user's preferences — GET /notifications/preferences */
	async getPreferences(): Promise<NotificationPreferences> {
		try {
			const response = await this.api.get<
				APIResponse<NotificationPreferences>
			>('/notifications/preferences');
			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Replace the current user's preferences — PUT /notifications/preferences
	 *
	 * The full map is sent on every save so the server never has to merge
	 * partial updates that may arrive out of order.
	 */
	async updatePreferences(
		preferences: NotificationPreferences
	): Promise<NotificationPreferences> {
		try {
			const response = await this.api.put<
				APIResponse<NotificationPreferences>
			>('/notifications/preferences', preferences);
			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const notificationPreferencesService =
	new NotificationPreferencesService();
