import { describe, expect, it } from 'vitest';
import {
	buildMonthlyDistributionSeries,
	hasDistributionAmount,
	resolveDistributionTotal,
	sumDistributionTotals,
} from '../distributions.utils';

// Anchor the 12-month window so the assertions are timezone independent.
const NOW = new Date('2026-11-21T12:00:00.000Z');

describe('distributions utils (#1259)', () => {
	it('builds a continuous 12-month series ending with the current month', () => {
		const series = buildMonthlyDistributionSeries(undefined, NOW);

		expect(series).toHaveLength(12);
		expect(series[0].month).toBe('2025-12');
		expect(series[11].month).toBe('2026-11');
		expect(series.every(bucket => bucket.amount === 0)).toBe(true);
	});

	it('places monthly amounts in the right bucket and fills gaps with zero', () => {
		const series = buildMonthlyDistributionSeries(
			[
				{ month: '2026-11', amount: 120 },
				{ month: '2026-08', amount: 30 },
				{ month: '2024-01', amount: 999 },
			],
			NOW
		);

		const byMonth = new Map(
			series.map(bucket => [bucket.month, bucket.amount])
		);
		expect(byMonth.get('2026-11')).toBe(120);
		expect(byMonth.get('2026-08')).toBe(30);
		expect(byMonth.get('2026-10')).toBe(0);
		// Outside the window is dropped, not appended.
		expect(byMonth.has('2024-01')).toBe(false);
		expect(series).toHaveLength(12);
	});

	it('accepts ISO timestamps as month keys and merges duplicate buckets', () => {
		const series = buildMonthlyDistributionSeries(
			[
				{ month: '2026-05-14T00:00:00.000Z', amount: 10 },
				{ month: '2026-05-28T00:00:00.000Z', amount: 15 },
			],
			NOW
		);

		const may = series.find(bucket => bucket.month === '2026-05');
		expect(may?.amount).toBe(25);
	});

	it('sums distribution totals per type and ignores invalid values', () => {
		expect(
			sumDistributionTotals({
				'revenue-share': 100,
				dividend: 50,
				airdrop: 25,
			})
		).toBe(175);
		expect(
			sumDistributionTotals({
				'revenue-share': 100,
				dividend: -20,
				airdrop: Number.NaN,
			})
		).toBe(100);
		expect(sumDistributionTotals(undefined)).toBe(0);
	});

	it('prefers the per-type breakdown for the running total', () => {
		expect(
			resolveDistributionTotal({
				totalReceived: 999,
				byType: { 'revenue-share': 100, dividend: 50, airdrop: 25 },
			})
		).toBe(175);
	});

	it('falls back to the API total when the breakdown is empty', () => {
		expect(
			resolveDistributionTotal({
				totalReceived: 200,
				byType: { 'revenue-share': 0, dividend: 0, airdrop: 0 },
			})
		).toBe(200);
		expect(resolveDistributionTotal(undefined)).toBe(0);
	});

	it('detects whether the chart has any amount to render', () => {
		expect(
			hasDistributionAmount([{ month: '2026-11', label: 'Nov', amount: 0 }])
		).toBe(false);
		expect(
			hasDistributionAmount([
				{ month: '2026-11', label: 'Nov', amount: 0.01 },
			])
		).toBe(true);
	});
});
