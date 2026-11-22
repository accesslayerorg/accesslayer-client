import { describe, expect, it } from 'vitest';
import {
	defaultReservedNetworkFee,
	maxBuyAmount,
	maxSellAmount,
	percentOfBalance,
	SELL_QUICK_PERCENTS,
} from '../swapQuantity.utils';

describe('percentOfBalance', () => {
	it('clicking 50% on a 10-key balance sets quantity to 5', () => {
		expect(percentOfBalance(10, 50)).toBe(5);
	});

	it('rounds down at small balances and never exceeds the held balance', () => {
		expect(percentOfBalance(1, 50)).toBe(0);
		expect(percentOfBalance(3, 50)).toBe(1);
		expect(percentOfBalance(9, 50)).toBe(4);
		expect(percentOfBalance(1, 99)).toBe(0);
		expect(percentOfBalance(2, 75)).toBe(1);
		expect(percentOfBalance(100, 75)).toBe(75);
	});

	it('never exceeds the held balance even with floating-point drift', () => {
		// 33% of 10 is 3.3 -> floor 3 <= 10
		expect(percentOfBalance(10, 33)).toBeLessThanOrEqual(10);
		expect(percentOfBalance(10, 33)).toBe(3);
		// 100% of balance equals the balance
		expect(percentOfBalance(10, 100)).toBe(10);
		expect(percentOfBalance(7, 100)).toBe(7);
	});

	it('returns zero for invalid inputs', () => {
		expect(percentOfBalance(0, 50)).toBe(0);
		expect(percentOfBalance(-5, 50)).toBe(0);
		expect(percentOfBalance(10, 0)).toBe(0);
		expect(percentOfBalance(10, -10)).toBe(0);
		expect(percentOfBalance(NaN, 50)).toBe(0);
		expect(percentOfBalance(10, NaN)).toBe(0);
		expect(percentOfBalance(Infinity, 50)).toBe(0);
	});
});

describe('maxSellAmount', () => {
	it('returns the entire held balance as whole keys', () => {
		expect(maxSellAmount(10)).toBe(10);
		expect(maxSellAmount(10.9)).toBe(10);
		expect(maxSellAmount(0)).toBe(0);
		expect(maxSellAmount(-1)).toBe(0);
		expect(maxSellAmount(NaN)).toBe(0);
	});
});

describe('maxBuyAmount', () => {
	it('leaves enough XLM for fees and reserve', () => {
		const fee = defaultReservedNetworkFee();
		expect(maxBuyAmount(1, fee)).toBe(0);
		expect(maxBuyAmount(1.0001, fee)).toBe(1);
		expect(maxBuyAmount(2, fee)).toBe(1);
		expect(maxBuyAmount(10, fee)).toBe(9);
		expect(maxBuyAmount(100, fee)).toBe(99);
	});

	it('never exceeds the balance', () => {
		expect(maxBuyAmount(10, 0)).toBe(10);
		expect(maxBuyAmount(10, 5)).toBe(5);
		expect(maxBuyAmount(5, 10)).toBe(0);
	});

	it('returns zero for invalid inputs', () => {
		expect(maxBuyAmount(0, 0.0001)).toBe(0);
		expect(maxBuyAmount(-1, 0.0001)).toBe(0);
		expect(maxBuyAmount(NaN, 0.0001)).toBe(0);
		expect(maxBuyAmount(10, NaN)).toBe(10);
	});
});

describe('defaultReservedNetworkFee', () => {
	it('matches the fee estimate helper default', () => {
		expect(defaultReservedNetworkFee()).toBe(0.0001);
	});
});

describe('SELL_QUICK_PERCENTS', () => {
	it('contains 25, 50 and 75', () => {
		expect(SELL_QUICK_PERCENTS).toEqual([25, 50, 75]);
	});
});
