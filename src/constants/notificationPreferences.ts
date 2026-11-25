import type { NotificationPreferenceType } from '@/services/notificationPreferences.service';

export const NOTIFICATION_PREFERENCE_COPY: Record<
	NotificationPreferenceType,
	{ label: string; description: string }
> = {
	settlement: {
		label: 'Settlement',
		description: 'Receive an alert when an on-chain settlement completes.',
	},
	kyc_expiry: {
		label: 'KYC expiry',
		description:
			'Get notified when your KYC verification is approaching expiry.',
	},
	watchlist_change: {
		label: 'Watchlist change',
		description: 'Receive alerts when an item on your watchlist changes.',
	},
	auto_invest: {
		label: 'Auto-invest',
		description: 'Get notified when an automatic investment is executed.',
	},
	maturity_approaching: {
		label: 'Maturity approaching',
		description: 'Receive an alert when an investment is nearing maturity.',
	},
};

export const SAVE_SUCCESS_COPY = 'Notification preferences saved';
export const SAVE_ERROR_COPY =
	"We couldn't save your notification preferences.";

export type PushEventType = 'order_executable' | 'gift_received' | 'price_alert';

export const PUSH_EVENT_COPY: Record<
	PushEventType,
	{ label: string; description: string }
> = {
	order_executable: {
		label: 'Executable orders',
		description:
			'Get a push notification when one of your orders becomes executable.',
	},
	gift_received: {
		label: 'Gifts received',
		description: 'Get a push notification when you receive a gift.',
	},
	price_alert: {
		label: 'Price alerts',
		description:
			'Get a push notification when an asset reaches one of your price alerts.',
	},
};

export const PUSH_OPT_IN_TITLE_COPY = 'Push notifications';
export const PUSH_OPT_IN_DESCRIPTION_COPY =
	'Enable optional push notifications to stay informed about time-sensitive events even when this tab is closed. You choose which events trigger a push, and you can turn them off at any time.';

export const PUSH_PERMISSION_DENIED_COPY =
	'Push notifications are blocked in your browser. To re-enable them, open your browser settings, find the notifications permission for this site, and allow notifications. Then return here and try again.';

export const PUSH_PERMISSION_UNSUPPORTED_COPY =
	'Your browser does not support push notifications.';

export const PUSH_ENABLE_ERROR_COPY =
	"We couldn't enable push notifications. Please try again.";

export const PUSH_DISABLE_ERROR_COPY =
	"We couldn't disable push notifications. Please try again.";

export const PUSH_PREFERENCES_SAVE_ERROR_COPY =
	"We couldn't update your push notification preferences.";