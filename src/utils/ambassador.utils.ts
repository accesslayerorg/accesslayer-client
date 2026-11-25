import type {
	AmbassadorPayout,
	AmbassadorTierConfig,
	AmbassadorTierProgress,
	UtmParams,
} from '@/types/ambassador.types';

export const AMBASSADOR_TIERS: AmbassadorTierConfig[] = [
	{
		id: 'bronze',
		name: 'Bronze',
		minReferrals: 0,
		minVolumeXlm: 0,
		revSharePercent: 10,
		benefits: ['10% trading fee share', 'Standard campaign tracking', 'Monthly payouts'],
	},
	{
		id: 'silver',
		name: 'Silver',
		minReferrals: 10,
		minVolumeXlm: 1000,
		revSharePercent: 15,
		benefits: ['15% trading fee share', 'Custom UTM campaign links', 'Bi-weekly payouts'],
	},
	{
		id: 'gold',
		name: 'Gold',
		minReferrals: 50,
		minVolumeXlm: 10000,
		revSharePercent: 20,
		benefits: ['20% trading fee share', 'Priority creator spotlights', 'Weekly payouts'],
	},
	{
		id: 'platinum',
		name: 'Platinum',
		minReferrals: 200,
		minVolumeXlm: 50000,
		revSharePercent: 25,
		benefits: ['25% trading fee share', 'Dedicated affiliate manager', 'Instant payouts & co-marketing'],
	},
];

/**
 * Computes current ambassador tier and progress toward the next tier.
 * User qualifies for a tier when BOTH referral count and volume meet or exceed thresholds.
 * Time Complexity: O(T) where T = number of tiers (4, constant O(1))
 * Space Complexity: O(1)
 */
export function calculateAmbassadorTier(
	referralCount: number,
	volumeXlm: number
): AmbassadorTierProgress {
	const safeReferrals = Math.max(0, referralCount);
	const safeVolume = Math.max(0, volumeXlm);

	let currentIndex = 0;
	for (let i = AMBASSADOR_TIERS.length - 1; i >= 0; i--) {
		const tier = AMBASSADOR_TIERS[i];
		if (safeReferrals >= tier.minReferrals && safeVolume >= tier.minVolumeXlm) {
			currentIndex = i;
			break;
		}
	}

	const currentTier = AMBASSADOR_TIERS[currentIndex];
	const nextTier =
		currentIndex < AMBASSADOR_TIERS.length - 1 ? AMBASSADOR_TIERS[currentIndex + 1] : null;

	if (!nextTier) {
		return {
			currentTier,
			nextTier: null,
			referralsProgressPercent: 100,
			volumeProgressPercent: 100,
			overallProgressPercent: 100,
			referralsRemaining: 0,
			volumeRemainingXlm: 0,
		};
	}

	const refSpan = Math.max(1, nextTier.minReferrals - currentTier.minReferrals);
	const volSpan = Math.max(1, nextTier.minVolumeXlm - currentTier.minVolumeXlm);

	const referralsProgressPercent = Math.min(
		100,
		Math.max(0, Math.round(((safeReferrals - currentTier.minReferrals) / refSpan) * 100))
	);
	const volumeProgressPercent = Math.min(
		100,
		Math.max(0, Math.round(((safeVolume - currentTier.minVolumeXlm) / volSpan) * 100))
	);
	const overallProgressPercent = Math.min(referralsProgressPercent, volumeProgressPercent);

	return {
		currentTier,
		nextTier,
		referralsProgressPercent,
		volumeProgressPercent,
		overallProgressPercent,
		referralsRemaining: Math.max(0, nextTier.minReferrals - safeReferrals),
		volumeRemainingXlm: Math.max(0, nextTier.minVolumeXlm - safeVolume),
	};
}

/**
 * Builds a tracked referral URL with UTM parameters and campaign label.
 * Time Complexity: O(1)
 * Space Complexity: O(1)
 */
export function buildTrackedReferralUrl(
	baseUrl: string,
	walletOrCode: string,
	utm: UtmParams = {}
): string {
	const cleanBase = baseUrl.replace(/\/+$/, '') || 'https://accesslayer.io';
	const url = new URL(cleanBase);
	url.searchParams.set('ref', walletOrCode);

	if (utm.utmSource?.trim()) url.searchParams.set('utm_source', utm.utmSource.trim());
	if (utm.utmMedium?.trim()) url.searchParams.set('utm_medium', utm.utmMedium.trim());
	if (utm.utmCampaign?.trim()) url.searchParams.set('utm_campaign', utm.utmCampaign.trim());
	if (utm.utmContent?.trim()) url.searchParams.set('utm_content', utm.utmContent.trim());
	if (utm.campaignLabel?.trim()) url.searchParams.set('campaign', utm.campaignLabel.trim());

	return url.toString();
}

/**
 * Builds the Stellar Expert transaction explorer URL for a payout.
 */
export function getPayoutExplorerUrl(txHash?: string, network: 'public' | 'testnet' = 'public'): string | null {
	if (!txHash) return null;
	return `https://stellar.expert/explorer/${network}/tx/${txHash}`;
}

/**
 * Aggregates payout totals by status.
 * Time Complexity: O(P) where P is number of payouts
 * Space Complexity: O(1)
 */
export function summarizePayouts(payouts: AmbassadorPayout[]): {
	totalEarningsXlm: number;
	earnedUnclaimedXlm: number;
	pendingXlm: number;
	paidXlm: number;
} {
	let earnedUnclaimedXlm = 0;
	let pendingXlm = 0;
	let paidXlm = 0;

	for (const p of payouts) {
		if (p.status === 'earned') earnedUnclaimedXlm += p.amountXlm;
		else if (p.status === 'pending') pendingXlm += p.amountXlm;
		else if (p.status === 'paid') paidXlm += p.amountXlm;
	}

	return {
		totalEarningsXlm: Number((earnedUnclaimedXlm + pendingXlm + paidXlm).toFixed(2)),
		earnedUnclaimedXlm: Number(earnedUnclaimedXlm.toFixed(2)),
		pendingXlm: Number(pendingXlm.toFixed(2)),
		paidXlm: Number(paidXlm.toFixed(2)),
	};
}
