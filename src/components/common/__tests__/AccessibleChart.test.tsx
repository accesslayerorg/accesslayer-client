import { describe, it, expect } from 'vitest';
import {
	generateTimeSeriesSummary,
	type TimeSeriesPoint,
} from '../AccessibleChart';

describe('generateTimeSeriesSummary', () => {
	it('returns no data message for empty array', () => {
		expect(generateTimeSeriesSummary([], 'price')).toBe('No data available.');
	});

	it('returns high, low, latest and trend for a rising series', () => {
		const data: TimeSeriesPoint[] = [
			{ timestamp: '2026-01-01T00:00:00Z', price: 10 },
			{ timestamp: '2026-01-02T00:00:00Z', price: 15 },
			{ timestamp: '2026-01-03T00:00:00Z', price: 20 },
		];
		const summary = generateTimeSeriesSummary(data, 'price', 'price');
		expect(summary).toContain('20');
		expect(summary).toContain('10');
		expect(summary).toContain('Trending up');
	});

	it('returns trend down for a declining series', () => {
		const data: TimeSeriesPoint[] = [
			{ timestamp: '2026-01-01T00:00:00Z', price: 100 },
			{ timestamp: '2026-01-02T00:00:00Z', price: 50 },
		];
		const summary = generateTimeSeriesSummary(data, 'price', 'price');
		expect(summary).toContain('Trending down');
	});

	it('returns flat trend when first equals last', () => {
		const data: TimeSeriesPoint[] = [
			{ timestamp: '2026-01-01T00:00:00Z', price: 42 },
			{ timestamp: '2026-01-02T00:00:00Z', price: 42 },
		];
		const summary = generateTimeSeriesSummary(data, 'price', 'price');
		expect(summary).toContain('Flat');
	});
});
