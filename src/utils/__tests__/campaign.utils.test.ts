import { describe, expect, it } from 'vitest';
import {
	canClaimCampaignReward,
	describeCampaignCriteria,
	filterActiveCampaigns,
	getCampaignEligibility,
	getCampaignStatus,
	groupCampaignsByStatus,
	type Campaign,
} from '@/utils/campaign.utils';

function makeCampaign(id: string, endsAt: string): Campaign {
	return {
		id,
		name: `Campaign ${id}`,
		creatorId: 'creator-1',
		keyName: 'NOVA',
		criteria: { type: 'hold_keys', target: 5 },
		rewardPoolXlm: 1000,
		endsAt,
	};
}

describe('describeCampaignCriteria', () => {
	it('describes each criteria type with the key name', () => {
		expect(describeCampaignCriteria({ type: 'hold_keys', target: 5 }, 'NOVA')).toBe(
			'Hold 5 NOVA keys'
		);
		expect(describeCampaignCriteria({ type: 'hold_keys', target: 1 }, 'NOVA')).toBe(
			'Hold 1 NOVA key'
		);
		expect(
			describeCampaignCriteria({ type: 'trade_volume', target: 2500 }, 'NOVA')
		).toBe('Trade 2,500 XLM of NOVA volume');
		expect(describeCampaignCriteria({ type: 'trade_count', target: 10 }, 'NOVA')).toBe(
			'Complete 10 NOVA trades'
		);
	});
});

describe('getCampaignEligibility', () => {
	it('computes partial progress', () => {
		expect(getCampaignEligibility(2, 8)).toEqual({
			current: 2,
			target: 8,
			percent: 25,
			eligible: false,
		});
	});

	it('marks the wallet eligible and clamps at 100%', () => {
		expect(getCampaignEligibility(12, 8)).toMatchObject({
			percent: 100,
			eligible: true,
		});
		expect(getCampaignEligibility(8, 8).eligible).toBe(true);
	});

	it('treats missing or invalid progress as zero', () => {
		expect(getCampaignEligibility(undefined, 8)).toMatchObject({
			current: 0,
			percent: 0,
			eligible: false,
		});
		expect(getCampaignEligibility(Number.NaN, 8).current).toBe(0);
		expect(getCampaignEligibility(-3, 8).current).toBe(0);
	});
});

describe('filterActiveCampaigns', () => {
	it('drops ended and unparseable campaigns', () => {
		const now = Date.parse('2026-10-20T12:00:00Z');
		const result = filterActiveCampaigns(
			[
				makeCampaign('live', '2026-10-21T00:00:00Z'),
				makeCampaign('ended', '2026-10-19T00:00:00Z'),
				makeCampaign('bad', 'not-a-date'),
			],
			now
		);
		expect(result.map(c => c.id)).toEqual(['live']);
	});
});

describe('getCampaignStatus', () => {
	const now = Date.parse('2026-10-20T12:00:00Z');

	it('classifies upcoming, active and ended campaigns', () => {
		expect(
			getCampaignStatus(
				{ startsAt: '2026-10-21T00:00:00Z', endsAt: '2026-10-30T00:00:00Z' },
				now
			)
		).toBe('upcoming');
		expect(getCampaignStatus({ endsAt: '2026-10-21T00:00:00Z' }, now)).toBe(
			'active'
		);
		expect(getCampaignStatus({ endsAt: '2026-10-19T00:00:00Z' }, now)).toBe(
			'ended'
		);
		expect(getCampaignStatus({ endsAt: 'not-a-date' }, now)).toBe('ended');
	});
});

describe('groupCampaignsByStatus', () => {
	it('orders active by soonest end and ended by most recent', () => {
		const now = Date.parse('2026-10-20T12:00:00Z');
		const groups = groupCampaignsByStatus(
			[
				makeCampaign('late', '2026-10-25T00:00:00Z'),
				makeCampaign('soon', '2026-10-21T00:00:00Z'),
				makeCampaign('old', '2026-10-01T00:00:00Z'),
				makeCampaign('recent', '2026-10-19T00:00:00Z'),
			],
			now
		);

		expect(groups.active.map(c => c.id)).toEqual(['soon', 'late']);
		expect(groups.ended.map(c => c.id)).toEqual(['recent', 'old']);
		expect(groups.upcoming).toEqual([]);
	});
});

describe('canClaimCampaignReward', () => {
	const now = Date.parse('2026-10-20T12:00:00Z');
	const ended = makeCampaign('e', '2026-10-19T00:00:00Z');

	it('allows eligible unclaimed wallets on ended campaigns only', () => {
		expect(canClaimCampaignReward({ ...ended, walletProgress: 5 }, now)).toBe(
			true
		);
		expect(
			canClaimCampaignReward({ ...ended, walletProgress: 5, claimed: true }, now)
		).toBe(false);
		expect(canClaimCampaignReward({ ...ended, walletProgress: 4 }, now)).toBe(
			false
		);
		expect(canClaimCampaignReward(ended, now)).toBe(false);
		expect(
			canClaimCampaignReward(
				{ ...makeCampaign('a', '2026-10-25T00:00:00Z'), walletProgress: 5 },
				now
			)
		).toBe(false);
	});
});
