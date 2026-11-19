import { formatNumber } from '@/utils/numberFormat.utils';

export type CampaignCriteriaType = 'hold_keys' | 'trade_volume' | 'trade_count';

export interface CampaignCriteria {
	type: CampaignCriteriaType;
	/** Amount the wallet must reach (keys, XLM volume or trades). */
	target: number;
}

export interface Campaign {
	id: string;
	name: string;
	creatorId: string;
	keyName: string;
	criteria: CampaignCriteria;
	/** Total reward pool in XLM. */
	rewardPoolXlm: number;
	/** ISO timestamp when the campaign opens; absent once it has started. */
	startsAt?: string | null;
	/** ISO timestamp when the campaign closes. */
	endsAt: string;
	/** Connected wallet's progress toward `criteria.target`; absent when signed out. */
	walletProgress?: number | null;
	/** Whether the connected wallet already claimed this campaign's reward. */
	claimed?: boolean;
}

export interface CampaignEligibility {
	current: number;
	target: number;
	/** Completion from 0 to 100. */
	percent: number;
	eligible: boolean;
}

/** Human-readable criteria line for a campaign card (#1226). */
export function describeCampaignCriteria(
	criteria: CampaignCriteria,
	keyName: string
): string {
	const target = formatNumber(criteria.target);
	switch (criteria.type) {
		case 'hold_keys':
			return `Hold ${target} ${keyName} ${criteria.target === 1 ? 'key' : 'keys'}`;
		case 'trade_volume':
			return `Trade ${target} XLM of ${keyName} volume`;
		case 'trade_count':
			return `Complete ${target} ${keyName} ${criteria.target === 1 ? 'trade' : 'trades'}`;
		default:
			return `Reach ${target} on ${keyName}`;
	}
}

/** Clamped eligibility progress for a wallet against a campaign target (#1226). */
export function getCampaignEligibility(
	walletProgress: number | null | undefined,
	target: number
): CampaignEligibility {
	const current =
		walletProgress != null && Number.isFinite(walletProgress) && walletProgress > 0
			? walletProgress
			: 0;
	if (!Number.isFinite(target) || target <= 0) {
		return { current, target: 0, percent: 100, eligible: true };
	}
	const percent = Math.min(100, Math.max(0, (current / target) * 100));
	return { current, target, percent, eligible: current >= target };
}

/** Drops campaigns whose end time has passed or is unparseable (#1226). */
export function filterActiveCampaigns(
	campaigns: readonly Campaign[],
	nowMs: number
): Campaign[] {
	return campaigns.filter(campaign => {
		const endsAtMs = new Date(campaign.endsAt).getTime();
		return Number.isFinite(endsAtMs) && endsAtMs > nowMs;
	});
}

export type CampaignStatus = 'upcoming' | 'active' | 'ended';

export interface CampaignsByStatus {
	active: Campaign[];
	upcoming: Campaign[];
	ended: Campaign[];
}

function parseTimeMs(value: string | null | undefined): number | null {
	if (!value) return null;
	const ms = new Date(value).getTime();
	return Number.isFinite(ms) ? ms : null;
}

/** Where a campaign sits relative to `nowMs`; unparseable end times count as ended (#1204). */
export function getCampaignStatus(
	campaign: Pick<Campaign, 'startsAt' | 'endsAt'>,
	nowMs: number
): CampaignStatus {
	const startsAtMs = parseTimeMs(campaign.startsAt);
	if (startsAtMs != null && startsAtMs > nowMs) return 'upcoming';
	const endsAtMs = parseTimeMs(campaign.endsAt);
	if (endsAtMs == null || endsAtMs <= nowMs) return 'ended';
	return 'active';
}

/**
 * Splits campaigns into active, upcoming and ended lists (#1204). Active and
 * upcoming campaigns are ordered by the next deadline; ended ones show the
 * most recently closed first.
 */
export function groupCampaignsByStatus(
	campaigns: readonly Campaign[],
	nowMs: number
): CampaignsByStatus {
	const groups: CampaignsByStatus = { active: [], upcoming: [], ended: [] };
	for (const campaign of campaigns) {
		groups[getCampaignStatus(campaign, nowMs)].push(campaign);
	}
	const endsAt = (campaign: Campaign) => parseTimeMs(campaign.endsAt) ?? 0;
	const startsAt = (campaign: Campaign) => parseTimeMs(campaign.startsAt) ?? 0;
	groups.active.sort((a, b) => endsAt(a) - endsAt(b));
	groups.upcoming.sort((a, b) => startsAt(a) - startsAt(b));
	groups.ended.sort((a, b) => endsAt(b) - endsAt(a));
	return groups;
}

/** An ended campaign the wallet qualified for and has not claimed yet (#1204). */
export function canClaimCampaignReward(
	campaign: Campaign,
	nowMs: number
): boolean {
	if (campaign.claimed) return false;
	if (getCampaignStatus(campaign, nowMs) !== 'ended') return false;
	if (campaign.walletProgress == null) return false;
	return getCampaignEligibility(campaign.walletProgress, campaign.criteria.target)
		.eligible;
}
