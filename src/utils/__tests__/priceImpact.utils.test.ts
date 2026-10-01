import { describe, expect, it } from 'vitest';
import {
	calculatePriceImpact,
	calculateTradePriceImpact,
	formatPriceImpact,
	isHighPriceImpact,
	PRICE_IMPACT_THRESHOLD_PERCENT,
} from '../priceImpact.utils';

describe('priceImpact.utils', () => {
	it('calculates price impact between simulated price and spot price', () => {
		expect(calculatePriceImpact(105, 100)).toBeCloseTo(5);
		expect(calculatePriceImpact(95, 100)).toBeCloseTo(-5);
		expect(calculatePriceImpact(100, 100)).toBe(0);
		expect(calculatePriceImpact(100, 0)).toBe(0);
	});

	it('formats price impact with appropriate sign and decimals', () => {
		expect(formatPriceImpact(0)).toBe('0.00%');
		expect(formatPriceImpact(5.25)).toBe('+5.25%');
		expect(formatPriceImpact(-3.5)).toBe('-3.50%');
	});

	it('identifies high price impact above threshold', () => {
		expect(PRICE_IMPACT_THRESHOLD_PERCENT).toBe(5);
		expect(isHighPriceImpact(5.1)).toBe(true);
		expect(isHighPriceImpact(5.0)).toBe(false);
		expect(isHighPriceImpact(4.9)).toBe(false);
		expect(isHighPriceImpact(-6)).toBe(true);
		expect(isHighPriceImpact(null)).toBe(false);
		expect(isHighPriceImpact(undefined)).toBe(false);
		expect(isHighPriceImpact(NaN)).toBe(false);
	});

	it('calculates trade price impact for buys using bonding curve', () => {
		// Buying 10 keys with 1% growth factor per key from supply 0
		const impact = calculateTradePriceImpact({
			side: 'buy',
			quantity: 10,
			currentSupply: 0,
		});
		expect(impact).toBeGreaterThan(5); // ~10% impact
		expect(isHighPriceImpact(impact)).toBe(true);

		// Buying 1 key from supply 100
		const smallImpact = calculateTradePriceImpact({
			side: 'buy',
			quantity: 1,
			currentSupply: 100,
		});
		expect(smallImpact).toBeLessThan(5);
		expect(isHighPriceImpact(smallImpact)).toBe(false);
	});

	it('calculates trade price impact for sells using bonding curve', () => {
		const impact = calculateTradePriceImpact({
			side: 'sell',
			quantity: 20,
			currentSupply: 50,
		});
		expect(impact).toBeGreaterThan(5);
		expect(isHighPriceImpact(impact)).toBe(true);

		// Zero quantity or invalid returns 0
		expect(
			calculateTradePriceImpact({
				side: 'sell',
				quantity: 0,
				currentSupply: 50,
			})
		).toBe(0);
	});
});
