export type AmbassadorTimeRange = '7d' | '30d' | '90d' | 'all';

export type AmbassadorTierId = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface AmbassadorTierConfig {
	id: AmbassadorTierId;
	name: string;
	minReferrals: number;
	minVolumeXlm: number;
	revSharePercent: number;
	benefits: string[];
}

export interface AmbassadorTierProgress {
	currentTier: AmbassadorTierConfig;
	nextTier: AmbassadorTierConfig | null;
	referralsProgressPercent: number;
	volumeProgressPercent: number;
	overallProgressPercent: number;
	referralsRemaining: number;
	volumeRemainingXlm: number;
}

export interface FunnelStage {
	stage: 'Clicks' | 'Sign-ups' | 'First Trades' | 'Repeat Traders';
	count: number;
	conversionPercent: number;
}

export interface DailyReferralMetric {
	date: string;
	referrals: number;
	volumeXlm: number;
}

export type PayoutStatus = 'earned' | 'pending' | 'paid';

export interface AmbassadorPayout {
	id: string;
	date: string;
	amountXlm: number;
	status: PayoutStatus;
	tierName: string;
	txHash?: string;
}

export interface UtmParams {
	utmSource?: string;
	utmMedium?: string;
	utmCampaign?: string;
	utmContent?: string;
	campaignLabel?: string;
}

export interface AmbassadorStats {
	summary: {
		referredUsers: number;
		activeTraders: number;
		volumeXlm: number;
		totalEarningsXlm: number;
		earnedUnclaimedXlm: number;
		pendingXlm: number;
		paidXlm: number;
	};
	funnel: FunnelStage[];
	dailyReferrals: DailyReferralMetric[];
	payouts: AmbassadorPayout[];
	tierProgress: AmbassadorTierProgress;
}
