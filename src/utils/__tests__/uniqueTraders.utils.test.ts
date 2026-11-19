import { describe, expect, it } from 'vitest';
import { getUniqueTradersTrend } from '@/utils/uniqueTraders.utils';

describe('getUniqueTradersTrend', () => {
	it('reports an upward change', () => {
		expect(getUniqueTradersTrend(15, 10)).toEqual({
			direction: 'up',
			delta: 5,
		});
	});

	it('reports a downward change as a positive delta', () => {
		expect(getUniqueTradersTrend(8, 10)).toEqual({
			direction: 'down',
			delta: 2,
		});
	});

	it('reports no change, including for new keys with zero traders', () => {
		expect(getUniqueTradersTrend(10, 10)).toEqual({
			direction: 'flat',
			delta: 0,
		});
		expect(getUniqueTradersTrend(0, 0)).toEqual({
			direction: 'flat',
			delta: 0,
		});
	});

	it('returns null when either value is missing or not finite', () => {
		expect(getUniqueTradersTrend(null, 10)).toBeNull();
		expect(getUniqueTradersTrend(10, undefined)).toBeNull();
		expect(getUniqueTradersTrend(Number.NaN, 10)).toBeNull();
	});
});
