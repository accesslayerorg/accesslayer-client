import { describe, expect, it } from 'vitest';
import {
	buildComparisonChartData,
	parseComparisonKeyIds,
} from '../keyComparison.utils';

describe('buildComparisonChartData (#1247)', () => {
	it('merges series by timestamp, converts stroops to XLM and fills gaps with null', () => {
		const rows = buildComparisonChartData([
			{
				keyId: 'a',
				points: [
					{ timestamp: '2026-01-01T00:00:00Z', price: 10_000_000 },
					{ timestamp: '2026-01-01T01:00:00Z', price: 20_000_000 },
				],
			},
			{
				keyId: 'b',
				points: [{ timestamp: '2026-01-01T01:00:00Z', price: 5_000_000 }],
			},
		]);
		expect(rows).toHaveLength(2);
		expect(rows[0]).toMatchObject({ a: 1, b: null });
		expect(rows[1]).toMatchObject({ a: 2, b: 0.5 });
		expect(rows[0].timestamp).toBeLessThan(rows[1].timestamp);
	});

	it('handles missing or invalid points', () => {
		expect(buildComparisonChartData([{ keyId: 'a', points: undefined }])).toEqual([]);
		expect(
			buildComparisonChartData([
				{ keyId: 'a', points: [{ timestamp: 'nope', price: 1 }] },
			])
		).toEqual([]);
	});
});

describe('parseComparisonKeyIds (#1247)', () => {
	it('trims, dedupes and caps at 3', () => {
		expect(parseComparisonKeyIds(' a, b ,a,c,d')).toEqual(['a', 'b', 'c']);
	});
	it('returns empty for null/empty', () => {
		expect(parseComparisonKeyIds(null)).toEqual([]);
		expect(parseComparisonKeyIds('')).toEqual([]);
	});
});
