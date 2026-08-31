import { describe, expect, it } from 'vitest';
import {
	estimateReinvest,
	hasUnclaimedDividend,
	xlmToStroops,
} from '../reinvestDividend.utils';

describe('estimateReinvest', () => {
	it('computes whole keys and XLM remainder from an unclaimed dividend', () => {
		// 1.25 XLM unclaimed, key price 0.5 XLM (5_000_000 stroops)
		const result = estimateReinvest(1.25, 5_000_000);

		expect(result).not.toBeNull();
		expect(result!.unclaimedStroops).toBe(12_500_000);
		expect(result!.estimatedKeys).toBe(2.5);
		expect(result!.wholeKeys).toBe(2);
		// remainder: 12_500_000 % 5_000_000 = 2_500_000 stroops = 0.25 XLM
		expect(result!.remainderStroops).toBe(2_500_000);
	});

	it('returns null when there is no unclaimed dividend', () => {
		expect(estimateReinvest(0, 5_000_000)).toBeNull();
		expect(estimateReinvest(null, 5_000_000)).toBeNull();
		expect(estimateReinvest(undefined, 5_000_000)).toBeNull();
	});

	it('returns null when key price is missing or non-positive', () => {
		expect(estimateReinvest(1.25, null)).toBeNull();
		expect(estimateReinvest(1.25, undefined)).toBeNull();
		expect(estimateReinvest(1.25, 0)).toBeNull();
		expect(estimateReinvest(1.25, -100)).toBeNull();
	});

	it('returns zero whole keys when dividend cannot buy one full key', () => {
		// 0.1 XLM unclaimed at 1 XLM/key -> 0 whole keys, full remainder
		const result = estimateReinvest(0.1, 10_000_000);

		expect(result).not.toBeNull();
		expect(result!.unclaimedStroops).toBe(1_000_000);
		expect(result!.wholeKeys).toBe(0);
		expect(result!.remainderStroops).toBe(1_000_000);
	});
});

describe('hasUnclaimedDividend', () => {
	it('is true only when a positive balance exists', () => {
		expect(hasUnclaimedDividend(0.5)).toBe(true);
		expect(hasUnclaimedDividend(0)).toBe(false);
		expect(hasUnclaimedDividend(null)).toBe(false);
		expect(hasUnclaimedDividend(undefined)).toBe(false);
	});
});

describe('xlmToStroops', () => {
	it('converts XLM to stroops and sanitizes invalid input', () => {
		expect(xlmToStroops(1)).toBe(10_000_000);
		expect(xlmToStroops(0)).toBe(0);
		expect(xlmToStroops(null)).toBe(0);
		expect(xlmToStroops(-5)).toBe(0);
	});
});
