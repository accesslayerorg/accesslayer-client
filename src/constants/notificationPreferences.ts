import type { NotificationPreferenceType } from '@/services/notificationPreferences.service';

export const NOTIFICATION_PREFERENCE_COPY: Record<
	NotificationPreferenceType,
	{ label: string; description: string }
> = {
	price_alert: {
		label: 'Price alert triggered',
		description: 'A key you set an alert on crosses your target price.',
	},
	milestone_reached: {
		label: 'Milestone reached',
		description: 'A creator you hold hits a bonding curve milestone.',
	},
	vesting_cliff: {
		label: 'Vesting cliff',
		description: 'A vesting cliff on your keys is about to unlock.',
	},
	staking_reward: {
		label: 'Staking reward',
		description: 'New staking rewards are ready to claim.',
	},
	governance_vote: {
		label: 'Governance vote',
		description: 'A vote opens or closes for a creator you hold.',
	},
	referral_earned: {
		label: 'Referral earned',
		description: 'Someone you referred makes their first trade.',
	},
	key_deprecated: {
		label: 'Key deprecated',
		description: 'A creator key you hold is deprecated or migrated.',
	},
};

export const SAVE_SUCCESS_COPY = 'Notification preferences saved';
export const SAVE_ERROR_COPY =
	"We couldn't save your notification preferences.";
