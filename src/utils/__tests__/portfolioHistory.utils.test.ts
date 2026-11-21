import { describe, expect, it } from 'vitest';
import {
	DAY_MS,
	PORTFOLIO_HISTORY_RANGES,
	buildPortfolioChartSeries,
	computeBenchmarkReturnPercent,
	computePortfolioReturnPercent,
	filterHistoryByRange,
	formatPortfolioHistoryDate,
	formatPortfolioReturnPercent,
	formatPortfolioValueXlm,
	normalizeHistory,
	type PortfolioHistoryPoint,
} from '@/utils/portfolioHistory.utils';

// Fixed clock so range windows are deterministic: 2026-09-28T12:00:00Z.
const NOW = Date.UTC(2026, 8, 28, 12, 0, 0);

const at = (
	daysAgo: number,
	value: number,
	benchmark?: number | null
): PortfolioHistoryPoint => ({
	timestamp: new Date(NOW - daysAgo * DAY_MS).toISOString(),
	value,
	benchmark: benchmark ?? null,
});

const series: PortfolioHistoryPoint[] = [
	at(80, 100, 200),
	at(20, 120, 220),
	at(3, 150, 260),
];

describe('portfolioHistory.utils — range selectors', () => {
	it('exposes the four acceptance-criteria ranges in display order', () => {
		expect(PORTFOLIO_HISTORY_RANGES.map(option => option.value)).toEqual([
			'7d',
			'30d',
			'90d',
			'all',
		]);
		expect(
			PORTFOLIO_HISTORY_RANGES.find(option => option.value === '7d')
				?.windowMs
		).toBe(7 * DAY_MS);
		expect(
			PORTFOLIO_HISTORY_RANGES.find(option => option.value === 'all')
				?.windowMs
		).toBeNull();
	});

	it('switches the data window for every period', () => {
		expect(filterHistoryByRange(series, '7d', NOW)).toHaveLength(1);
		expect(filterHistoryByRange(series, '30d', NOW)).toHaveLength(2);
		expect(filterHistoryByRange(series, '90d', NOW)).toHaveLength(3);
		expect(filterHistoryByRange(series, 'all', NOW)).toHaveLength(3);
	});

	it('keeps a sample that sits exactly on the range boundary', () => {
		const boundary = [at(7, 42)];
		expect(filterHistoryByRange(boundary, '7d', NOW)).toHaveLength(1);
	});

	it('sorts ascending and drops malformed samples', () => {
		const messy: PortfolioHistoryPoint[] = [
			{ timestamp: 'not-a-date', value: 10 },
			{ timestamp: new Date(NOW).toISOString(), value: Number.NaN },
			at(5, 30),
			at(10, 20),
		];

		const normalized = normalizeHistory(messy);

		expect(normalized.map(point => point.value)).toEqual([20, 30]);
	});
});

describe('portfolioHistory.utils — percentage return', () => {
	it('computes the return from the first to the last data point', () => {
		// 100 -> 150 = +50%.
		expect(computePortfolioReturnPercent(series)).toBeCloseTo(50);
	});

	it('measures only the visible range when a window is applied', () => {
		// 30d window keeps 120 -> 150 = +25%.
		const ranged = filterHistoryByRange(series, '30d', NOW);
		expect(computePortfolioReturnPercent(ranged)).toBeCloseTo(25);
	});

	it('returns null when there is no meaningful change to compute', () => {
		expect(computePortfolioReturnPercent([])).toBeNull();
		expect(computePortfolioReturnPercent([at(1, 10)])).toBeNull();
		expect(computePortfolioReturnPercent([at(1, 0), at(0, 10)])).toBeNull();
	});

	it('computes the benchmark return from benchmark levels only', () => {
		// 200 -> 260 = +30%; the missing level on a partial series is ignored.
		expect(computeBenchmarkReturnPercent(series)).toBeCloseTo(30);
		expect(
			computeBenchmarkReturnPercent([
				{ timestamp: new Date(NOW).toISOString(), value: 10 },
				{ timestamp: new Date(NOW + 1).toISOString(), value: 12 },
			])
		).toBeNull();
	});
});

describe('portfolioHistory.utils — chart series', () => {
	it('plots portfolio values unchanged when the benchmark is hidden', () => {
		const rows = buildPortfolioChartSeries(series, {
			showBenchmark: false,
		});

		expect(rows.map(row => row.portfolio)).toEqual([100, 120, 150]);
		expect(rows.every(row => row.benchmark === null)).toBe(true);
	});

	it('rebases the benchmark so both lines share the portfolio start value', () => {
		const rows = buildPortfolioChartSeries(series, { showBenchmark: true });

		// Benchmark 200/200 -> 220/200 -> 260/200, scaled by the portfolio's
		// opening value of 100.
		const rebased = rows.map(row => row.benchmark);
		expect(rebased[0]).toBeCloseTo(100);
		expect(rebased[1]).toBeCloseTo(110);
		expect(rebased[2]).toBeCloseTo(130);
	});

	it('leaves the benchmark null when no sample carries a level', () => {
		const rows = buildPortfolioChartSeries([at(2, 10), at(1, 20)], {
			showBenchmark: true,
		});

		expect(rows.every(row => row.benchmark === null)).toBe(true);
	});
});

describe('portfolioHistory.utils — formatters', () => {
	it('formats values, dates and returns for the tooltip and axis', () => {
		expect(formatPortfolioValueXlm(1234.5)).toBe('1234.50 XLM');
		expect(formatPortfolioValueXlm(Number.NaN)).toBe('—');
		expect(formatPortfolioHistoryDate(at(0, 1).timestamp)).toContain('2026');
		expect(formatPortfolioHistoryDate('nonsense')).toBe('—');
		expect(formatPortfolioReturnPercent(12.34)).toBe('+12.3%');
		expect(formatPortfolioReturnPercent(-4)).toBe('-4.0%');
		expect(formatPortfolioReturnPercent(0)).toBe('0%');
		expect(formatPortfolioReturnPercent(null)).toBe('—');
	});
});
