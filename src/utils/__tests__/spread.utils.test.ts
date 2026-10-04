import { describe, expect, it } from 'vitest';
import { calculateKeySpread, hasSpreadDisplay } from '../spread.utils';

describe('spread.utils (#951)', () => {
	it('derives the spread from buy and sell prices', () => {
		const spread = calculateKeySpread({
			buyPriceStroops: 1_000_000,
			sellPriceStroops: 950_000,
		});

		expect(spread.buyPriceStroops).toBe(1_000_000);
		expect(spread.sellPriceStroops).toBe(950_000);
		expect(spread.spreadStroops).toBe(50_000);
		expect(spread.spreadPercent).toBeCloseTo(5);
		expect(spread.hasSpread).toBe(true);
		expect(spread.isZero).toBe(false);
	});

	it('treats a negative price difference as a positive spread', () => {
		const spread = calculateKeySpread({
			buyPriceStroops: 900_000,
			sellPriceStroops: 1_000_000,
		});

		expect(spread.spreadStroops).toBe(100_000);
		expect(spread.spreadPercent).toBeCloseTo(11.111, 2);
	});

	it('prefers an explicit spread amount reported by the API', () => {
		const spread = calculateKeySpread({
			buyPriceStroops: 1_000_000,
			sellPriceStroops: 950_000,
			spreadStroops: 12_345,
		});

		expect(spread.spreadStroops).toBe(12_345);
	});

	it('prefers explicit spread basis points for the percentage', () => {
		const spread = calculateKeySpread({
			buyPriceStroops: 1_000_000,
			sellPriceStroops: 950_000,
			spreadBps: 250,
		});

		expect(spread.spreadPercent).toBe(2.5);
	});

	it('reports a zero spread when buy and sell prices are equal', () => {
		const spread = calculateKeySpread({
			buyPriceStroops: 1_000_000,
			sellPriceStroops: 1_000_000,
		});

		expect(spread.spreadStroops).toBe(0);
		expect(spread.hasSpread).toBe(false);
		expect(spread.isZero).toBe(true);
		expect(spread.hasPricePair).toBe(true);
		expect(spread.spreadPercent).toBe(0);
	});

	it('reports no spread when only one side of the price pair is known', () => {
		const spread = calculateKeySpread({ buyPriceStroops: 1_000_000 });

		expect(spread.spreadStroops).toBeNull();
		expect(spread.spreadPercent).toBeNull();
		expect(spread.hasSpread).toBe(false);
		expect(spread.isZero).toBe(false);
		expect(spread.hasPricePair).toBe(false);
	});

	it('ignores non-finite config values', () => {
		const spread = calculateKeySpread({
			buyPriceStroops: Number.NaN,
			sellPriceStroops: 1_000_000,
			spreadStroops: Number.POSITIVE_INFINITY,
			spreadBps: Number.NaN,
		});

		expect(spread.spreadStroops).toBeNull();
		expect(spread.spreadPercent).toBeNull();
		expect(spread.hasSpread).toBe(false);
	});

	it('hasSpreadDisplay is true for a non-zero spread and for an equal price pair', () => {
		expect(
			hasSpreadDisplay(
				calculateKeySpread({
					buyPriceStroops: 1_000_000,
					sellPriceStroops: 950_000,
				})
			)
		).toBe(true);
		expect(
			hasSpreadDisplay(
				calculateKeySpread({
					buyPriceStroops: 1_000_000,
					sellPriceStroops: 1_000_000,
				})
			)
		).toBe(true);
		expect(hasSpreadDisplay(calculateKeySpread({}))).toBe(false);
	});
});
