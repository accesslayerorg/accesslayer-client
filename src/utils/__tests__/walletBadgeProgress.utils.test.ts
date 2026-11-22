import { describe, expect, it } from 'vitest';
import {
	BADGE_CATALOG,
	BADGE_PROGRESS_CRITERIA,
	computeBadgeProgress,
} from '@/utils/walletBadges.utils';

describe('computeBadgeProgress', () => {
	it('defines progress criteria for every catalog badge', () => {
		for (const badge of BADGE_CATALOG) {
			expect(BADGE_PROGRESS_CRITERIA[badge.id].target).toBeGreaterThan(0);
		}
	});

	it('measures volume toward Whale and trades toward Top Trader', () => {
		const { inProgress } = computeBadgeProgress([], {
			tradeVolumeXlm: 2500,
			tradeCount: 40,
		});
		const whale = inProgress.find(b => b.id === 'whale');
		const topTrader = inProgress.find(b => b.id === 'top-trader');
		expect(whale).toMatchObject({ current: 2500, target: 10_000, percent: 25 });
		expect(topTrader).toMatchObject({ current: 40, target: 100, percent: 40 });
	});

	it('clamps progress at 100% and treats missing metrics as zero', () => {
		const { inProgress } = computeBadgeProgress([], {
			tradeVolumeXlm: 50_000,
			tradeCount: Number.NaN,
		});
		expect(inProgress.find(b => b.id === 'whale')?.percent).toBe(100);
		expect(inProgress.find(b => b.id === 'top-trader')?.current).toBe(0);
		expect(inProgress.find(b => b.id === 'staker')?.percent).toBe(0);
	});

	it('moves earned badges out of the in-progress list with their date', () => {
		const { earned, inProgress } = computeBadgeProgress(
			[{ type: 'first-key', earnedAt: '2026-09-01T00:00:00Z' }],
			{ keysBought: 3 }
		);
		expect(earned).toEqual([
			expect.objectContaining({ id: 'first-key', earnedAt: '2026-09-01T00:00:00Z' }),
		]);
		expect(inProgress.some(b => b.id === 'first-key')).toBe(false);
	});

	it('returns no in-progress badges when every badge is earned', () => {
		const all = BADGE_CATALOG.map(b => ({ type: b.id, earnedAt: '2026-09-01T00:00:00Z' }));
		expect(computeBadgeProgress(all, null).inProgress).toEqual([]);
	});
});
