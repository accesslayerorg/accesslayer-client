import { describe, expect, it } from 'vitest';
import {
	calculateAmbassadorTier,
	buildTrackedReferralUrl,
	getPayoutExplorerUrl,
	summarizePayouts,
} from '@/utils/ambassador.utils';
import type { AmbassadorPayout } from '@/types/ambassador.types';

describe('Ambassador Utilities (#1478)', () => {
	describe('calculateAmbassadorTier', () => {
		it('assigns Bronze tier for zero or low activity', () => {
			const res = calculateAmbassadorTier(0, 0);
			expect(res.currentTier.id).toBe('bronze');
			expect(res.nextTier?.id).toBe('silver');
			expect(res.referralsRemaining).toBe(10);
			expect(res.volumeRemainingXlm).toBe(1000);
			expect(res.overallProgressPercent).toBe(0);
		});

		it('assigns Silver tier when both referrals (>= 10) and volume (>= 1000) meet thresholds', () => {
			const res = calculateAmbassadorTier(15, 2500);
			expect(res.currentTier.id).toBe('silver');
			expect(res.nextTier?.id).toBe('gold');
			expect(res.currentTier.revSharePercent).toBe(15);
		});

		it('requires BOTH thresholds to advance tier (e.g. high referrals but low volume stays Bronze)', () => {
			const res = calculateAmbassadorTier(50, 500);
			expect(res.currentTier.id).toBe('bronze');
			expect(res.nextTier?.id).toBe('silver');
		});

		it('assigns Platinum tier at maximum thresholds with 100% progress', () => {
			const res = calculateAmbassadorTier(250, 60000);
			expect(res.currentTier.id).toBe('platinum');
			expect(res.nextTier).toBeNull();
			expect(res.overallProgressPercent).toBe(100);
		});
	});

	describe('buildTrackedReferralUrl', () => {
		it('builds a valid tracked URL with ref, UTM parameters, and campaign label', () => {
			const url = buildTrackedReferralUrl('https://accesslayer.io/', 'WALLET123', {
				utmSource: 'twitter',
				utmMedium: 'social',
				utmCampaign: 'spring_drop',
				utmContent: 'banner_1',
				campaignLabel: 'creator_promo',
			});

			const parsed = new URL(url);
			expect(parsed.origin).toBe('https://accesslayer.io');
			expect(parsed.searchParams.get('ref')).toBe('WALLET123');
			expect(parsed.searchParams.get('utm_source')).toBe('twitter');
			expect(parsed.searchParams.get('utm_medium')).toBe('social');
			expect(parsed.searchParams.get('utm_campaign')).toBe('spring_drop');
			expect(parsed.searchParams.get('utm_content')).toBe('banner_1');
			expect(parsed.searchParams.get('campaign')).toBe('creator_promo');
		});
	});

	describe('getPayoutExplorerUrl', () => {
		it('returns Stellar Expert tx URL when hash is provided', () => {
			expect(getPayoutExplorerUrl('abc123', 'public')).toBe(
				'https://stellar.expert/explorer/public/tx/abc123'
			);
			expect(getPayoutExplorerUrl(undefined)).toBeNull();
		});
	});

	describe('summarizePayouts', () => {
		it('aggregates earned, pending, paid, and total earnings accurately', () => {
			const payouts: AmbassadorPayout[] = [
				{ id: '1', date: '2026-01-01', amountXlm: 50, status: 'earned', tierName: 'Silver' },
				{ id: '2', date: '2026-01-02', amountXlm: 100, status: 'pending', tierName: 'Silver' },
				{ id: '3', date: '2026-01-03', amountXlm: 200.5, status: 'paid', tierName: 'Bronze', txHash: '0x1' },
			];

			const summary = summarizePayouts(payouts);
			expect(summary.earnedUnclaimedXlm).toBe(50);
			expect(summary.pendingXlm).toBe(100);
			expect(summary.paidXlm).toBe(200.5);
			expect(summary.totalEarningsXlm).toBe(350.5);
		});
	});
});
