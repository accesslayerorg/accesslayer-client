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
