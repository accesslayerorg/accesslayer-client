import { describe, expect, it } from 'vitest';
import type { KeySnapshot } from '@/services/keySnapshotHistory.service';
import {
	MIN_HISTORY_DAYS,
	buildCorrelationMatrix,
	dailyReturns,
	diversificationScore,
	highlyCorrelatedPairs,
	labelForScore,
	normaliseWeights,
	pearsonCorrelation,
} from '@/utils/portfolioCorrelation.utils';

/** Daily snapshots from a list of prices, one per day from 2026-01-01. */
function snapshots(prices: number[], start = '2026-01-01'): KeySnapshot[] {
	const t0 = Date.parse(`${start}T12:00:00Z`);
	return prices.map((priceStroops, i) => ({
		snapshotDate: new Date(t0 + i * 86_400_000).toISOString(),
		priceStroops,
		volumeStroops: 0,
		holderCount: 0,
		marketCapStroops: 0,
	}));
}

/** A deterministic price walk from a list of daily returns. */
function walk(returns: number[], p0 = 1_000_000): number[] {
	const out = [p0];
	for (const r of returns) out.push(out[out.length - 1] * (1 + r));
	return out;
}

const base = [0.02, -0.01, 0.03, -0.02, 0.01, 0.04, -0.03, 0.02, -0.01, 0.0, 0.05, -0.02, 0.01, -0.04, 0.03, 0.02, -0.01, 0.01, -0.02, 0.03];

describe('dailyReturns', () => {
	it('builds simple returns from consecutive daily closes', () => {
		const s = dailyReturns(snapshots([100, 110, 99]));
		expect(s.days).toBe(3);
		expect([...s.byDay.values()].map(v => +v.toFixed(4))).toEqual([0.1, -0.1]);
	});

	it('keeps the last snapshot of a day and skips gaps and bad prices', () => {
		const snaps = [
			...snapshots([100]),
			{ ...snapshots([105])[0], snapshotDate: '2026-01-01T23:00:00Z' },
			...snapshots([110, 0], '2026-01-02'),
			...snapshots([121], '2026-01-05'), // gap after 01-02
		];
		const s = dailyReturns(snaps);
		expect(s.days).toBe(3); // 01-01 (105), 01-02 (110), 01-05 (121); 0 dropped
		expect([...s.byDay.entries()]).toEqual([['2026-01-02', 110 / 105 - 1]]);
	});
});

describe('pearsonCorrelation', () => {
	const a = dailyReturns(snapshots(walk(base)));

	it('is 1 for identical moves and -1 for opposite ones', () => {
		const same = dailyReturns(snapshots(walk(base, 5_000)));
		const opposite = dailyReturns(snapshots(walk(base.map(r => -r))));
		expect(pearsonCorrelation(a, same)).toBeCloseTo(1, 10);
		expect(pearsonCorrelation(a, opposite)).toBeCloseTo(-1, 10);
	});

	it('is undefined for a flat series or too little overlap', () => {
		const flat = dailyReturns(snapshots(new Array(base.length + 1).fill(500)));
		expect(pearsonCorrelation(a, flat)).toBeNull();
		const short = dailyReturns(snapshots(walk(base.slice(0, 5))));
		expect(pearsonCorrelation(a, short)).toBeNull();
	});
});

describe('correlation matrix', () => {
	const series = new Map([
		['a', dailyReturns(snapshots(walk(base)))],
		['b', dailyReturns(snapshots(walk(base.map(r => r * 1.5 + 0.001))))],
		['c', dailyReturns(snapshots(walk(base.map((r, i) => (i % 2 ? r : -r)))))],
	]);
	const m = buildCorrelationMatrix(series);

	it('is symmetric with ones on the diagonal', () => {
		for (let i = 0; i < 3; i++) {
			expect(m.values[i][i]).toBe(1);
			for (let j = 0; j < 3; j++) expect(m.values[i][j]).toBe(m.values[j][i]);
		}
	});

	it('highlights pairs above 0.8 only', () => {
		const pairs = highlyCorrelatedPairs(m);
		expect(pairs.map(p => [p.a, p.b])).toEqual([['a', 'b']]);
		expect(pairs[0].correlation).toBeGreaterThan(0.8);
		expect(Math.abs(m.values[0][2]!)).toBeLessThan(0.8);
	});
});

describe('diversification score', () => {
	const independent = new Map([
		['a', dailyReturns(snapshots(walk(base)))],
		['c', dailyReturns(snapshots(walk(base.map((r, i) => (i % 2 ? r : -r)))))],
	]);
	const together = new Map([
		['a', dailyReturns(snapshots(walk(base)))],
		['b', dailyReturns(snapshots(walk(base.map(r => r * 1.5))))],
	]);

	it('scores zero for a single position', () => {
		const m = buildCorrelationMatrix(new Map([['a', independent.get('a')!]]));
		const s = diversificationScore(new Map([['a', 1]]), m);
		expect(s.score).toBe(0);
		expect(s.label).toBe('Highly concentrated');
		expect(s.summary).toMatch(/single key/);
	});

	it('scores evenly spread, independent keys higher than correlated ones', () => {
		const w = new Map([
			['a', 1],
			['b', 1],
			['c', 1],
		]);
		const ind = diversificationScore(w, buildCorrelationMatrix(independent));
		const tog = diversificationScore(w, buildCorrelationMatrix(together));
		expect(ind.score).toBeGreaterThan(tog.score);
		expect(tog.score).toBe(0); // perfectly correlated pair: no diversification
	});

	it('changes when the weights change', () => {
		const m = buildCorrelationMatrix(independent);
		const even = diversificationScore(new Map([['a', 50], ['c', 50]]), m);
		const lopsided = diversificationScore(new Map([['a', 95], ['c', 5]]), m);
		expect(even.score).toBeGreaterThan(lopsided.score);
		expect(even.concentration).toBeCloseTo(0.5, 10);
		expect(lopsided.concentration).toBeCloseTo(0.95 ** 2 + 0.05 ** 2, 10);
		expect(even.effectivePositions).toBeCloseTo(2, 10);
	});

	it('maps scores to plain-language labels', () => {
		expect(labelForScore(80)).toBe('Well diversified');
		expect(labelForScore(40)).toBe('Moderately diversified');
		expect(labelForScore(20)).toBe('Concentrated');
		expect(labelForScore(5)).toBe('Highly concentrated');
	});

	it('normalises weights and ignores non-positive values', () => {
		expect([...normaliseWeights(new Map([['a', 3], ['b', 1], ['c', 0], ['d', -2]]))]).toEqual([
			['a', 0.75],
			['b', 0.25],
		]);
	});

	it('requires 14 days of history by default', () => {
		expect(MIN_HISTORY_DAYS).toBe(14);
	});
});
