import { describe, expect, it } from 'vitest';
import {
	aggregateDailyEarnings,
	aggregateEarningsSummary,
	applyClaimToSummary,
	EARNINGS_STREAM_CONTRACT_CALLS,
} from '@/utils/creatorEarnings.utils';
import type { CreatorEarningsRecord } from '@/types/creatorEarnings';

const CREATOR_ID = 'creator-1';

function record(
	overrides: Partial<CreatorEarningsRecord> = {}
): CreatorEarningsRecord {
	return {
		id: `record-${Math.random().toString(36).slice(2)}`,
		creatorId: CREATOR_ID,
		stream: 'royalties',
		earnedAt: new Date('2026-11-20T12:00:00.000Z').toISOString(),
		amountXlm: 10,
		status: 'unclaimed',
		...overrides,
	};
}

describe('aggregateEarningsSummary', () => {
	it('computes per-stream and total unclaimed balances across all streams', () => {
		const summary = aggregateEarningsSummary(CREATOR_ID, [
			record({ stream: 'royalties', amountXlm: 100, status: 'unclaimed' }),
			record({ stream: 'royalties', amountXlm: 50, status: 'claimed' }),
			record({ stream: 'tips', amountXlm: 20, status: 'unclaimed' }),
			record({ stream: 'subscriptions', amountXlm: 30, status: 'claimed' }),
			record({ stream: 'spotlight', amountXlm: 40, status: 'unclaimed' }),
		]);

		expect(summary.streams.royalties).toMatchObject({
			totalEarnedXlm: 150,
			unclaimedXlm: 100,
			claimedXlm: 50,
		});
		expect(summary.streams.tips.unclaimedXlm).toBe(20);
		expect(summary.streams.subscriptions.unclaimedXlm).toBe(0);
		expect(summary.streams.subscriptions.claimedXlm).toBe(30);
		expect(summary.streams.spotlight.unclaimedXlm).toBe(40);
		expect(summary.totalUnclaimedXlm).toBe(160);
		expect(summary.totalEarnedXlm).toBe(240);
	});

	it('uses authoritative source totals when provided', () => {
		const summary = aggregateEarningsSummary(
			CREATOR_ID,
			[record({ stream: 'royalties', amountXlm: 10 })],
			{
				royalties: {
					totalEarnedXlm: 500,
					unclaimedXlm: 120,
					claimedXlm: 380,
				},
			}
		);

		expect(summary.streams.royalties).toMatchObject({
			totalEarnedXlm: 500,
			unclaimedXlm: 120,
			claimedXlm: 380,
		});
		expect(summary.totalUnclaimedXlm).toBe(120);
		expect(summary.totalEarnedXlm).toBe(500);
	});

	it('sorts records newest first and ignores malformed entries', () => {
		const summary = aggregateEarningsSummary(CREATOR_ID, [
			record({ earnedAt: '2026-11-01T00:00:00.000Z', amountXlm: 1 }),
			record({ earnedAt: '2026-11-10T00:00:00.000Z', amountXlm: 2 }),
			{ ...record(), amountXlm: Number.NaN },
		]);

		expect(summary.records).toHaveLength(2);
		expect(summary.records[0].earnedAt).toBe('2026-11-10T00:00:00.000Z');
		expect(summary.totalUnclaimedXlm).toBe(3);
	});
});

describe('aggregateDailyEarnings', () => {
	const now = new Date('2026-11-20T12:00:00.000Z').getTime();

	it('emits a 30-day series with combined daily totals', () => {
		const points = aggregateDailyEarnings(
			[
				record({ stream: 'royalties', amountXlm: 5 }),
				record({ stream: 'tips', amountXlm: 7 }),
				record({
					stream: 'spotlight',
					amountXlm: 3,
					earnedAt: '2026-11-19T00:00:00.000Z',
				}),
			],
			30,
			now
		);

		expect(points).toHaveLength(30);
		expect(points[29].date).toBe('2026-11-20');
		expect(points[29].totalXlm).toBe(12);
		expect(points[29].royaltiesXlm).toBe(5);
		expect(points[29].tipsXlm).toBe(7);
		expect(points[28].spotlightXlm).toBe(3);
		expect(points[28].totalXlm).toBe(3);
	});

	it('excludes records older than the window', () => {
		const points = aggregateDailyEarnings(
			[record({ earnedAt: '2026-01-01T00:00:00.000Z' })],
			30,
			now
		);

		expect(points.reduce((sum, point) => sum + point.totalXlm, 0)).toBe(0);
	});
});

describe('earnings stream contract calls', () => {
	it('maps each stream to its dedicated claim function', () => {
		expect(EARNINGS_STREAM_CONTRACT_CALLS).toEqual({
			royalties: 'claim_royalties',
			tips: 'claim_tips',
			subscriptions: 'claim_subscription_fees',
			spotlight: 'claim_spotlight_earnings',
		});
	});
});

describe('applyClaimToSummary', () => {
	it('reduces only the claimed stream and recomputes the combined balance', () => {
		const summary = aggregateEarningsSummary(CREATOR_ID, [
			record({ stream: 'tips', amountXlm: 20, status: 'unclaimed' }),
			record({ stream: 'royalties', amountXlm: 50, status: 'unclaimed' }),
		]);

		const updated = applyClaimToSummary(
			summary,
			'tips',
			20,
			'tx-hash',
			1700000000000
		);

		expect(updated.streams.tips.unclaimedXlm).toBe(0);
		expect(updated.streams.tips.claimedXlm).toBe(20);
		expect(updated.streams.tips.totalEarnedXlm).toBe(20);
		expect(updated.streams.royalties.unclaimedXlm).toBe(50);
		expect(updated.totalUnclaimedXlm).toBe(50);
		expect(updated.totalEarnedXlm).toBe(70);
		expect(
			updated.records.find(entry => entry.stream === 'tips')
		).toMatchObject({ status: 'claimed', transactionHash: 'tx-hash' });
		expect(
			updated.records.find(entry => entry.stream === 'royalties')?.status
		).toBe('unclaimed');
	});

	it('never reduces the unclaimed balance below zero', () => {
		const summary = aggregateEarningsSummary(CREATOR_ID, [
			record({ stream: 'spotlight', amountXlm: 10, status: 'unclaimed' }),
		]);

		const updated = applyClaimToSummary(summary, 'spotlight', 999, 'tx-hash');

		expect(updated.streams.spotlight.unclaimedXlm).toBe(0);
		expect(updated.streams.spotlight.claimedXlm).toBe(10);
		expect(updated.totalUnclaimedXlm).toBe(0);
	});
});
