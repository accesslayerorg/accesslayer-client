import { describe, expect, it } from 'vitest';
import {
	estimateSellProceeds,
	formatCreatorKeyPriceDisplay,
	formatDisplayKeyPrice,
	resolveCreatorKeyPriceStroops,
	formatKeyPrice,
} from '../keyPriceDisplay.utils';
import { STROOPS_PER_XLM } from '@/constants/stellar';

describe('resolveCreatorKeyPriceStroops', () => {
	it('prefers explicit stroops', () => {
		expect(
			resolveCreatorKeyPriceStroops({ priceStroops: 42, price: 1 })
		).toBe(42);
	});

	it('derives stroops from legacy XLM price', () => {
		expect(resolveCreatorKeyPriceStroops({ price: 0.05 })).toBe(
			0.05 * STROOPS_PER_XLM
		);
	});
});

describe('formatDisplayKeyPrice', () => {
	it('formats amounts above the XLM display threshold in XLM', () => {
		expect(formatDisplayKeyPrice(500_000)).toBe('0.05 XLM');
	});

	it('falls back to stroops when XLM would round to zero', () => {
		expect(formatDisplayKeyPrice(1)).toBe('1 stroops');
	});

	it('returns placeholder for missing values', () => {
		expect(formatDisplayKeyPrice(null)).toBe('—');
	});
});

describe('formatCreatorKeyPriceDisplay', () => {
	it('formats from stroops on a creator record', () => {
		expect(formatCreatorKeyPriceDisplay({ priceStroops: 1_200_000 })).toBe(
			'0.12 XLM'
		);
	});
});

describe('estimateSellProceeds', () => {
	it('multiplies key price by sell quantity', () => {
		expect(estimateSellProceeds(1_000_000, 50, 3)).toBe(3_000_000);
	});

	it('returns null when key price is null or undefined', () => {
		expect(estimateSellProceeds(null, 50, 3)).toBeNull();
		expect(estimateSellProceeds(undefined, 50, 3)).toBeNull();
	});

	it('returns null when current supply is null or undefined', () => {
		expect(estimateSellProceeds(1_000_000, null, 3)).toBeNull();
		expect(estimateSellProceeds(1_000_000, undefined, 3)).toBeNull();
	});

	it('returns null when sell quantity is zero or negative', () => {
		expect(estimateSellProceeds(1_000_000, 50, 0)).toBeNull();
		expect(estimateSellProceeds(1_000_000, 50, -1)).toBeNull();
	});

	it('returns null for non-finite inputs', () => {
		expect(estimateSellProceeds(NaN, 50, 3)).toBeNull();
		expect(estimateSellProceeds(1_000_000, Infinity, 3)).toBeNull();
		expect(estimateSellProceeds(1_000_000, 50, Infinity)).toBeNull();
	});
});

describe('formatKeyPrice', () => {
	it('formats zero correctly with 4 decimal places', () => {
		expect(formatKeyPrice(0n)).toBe('0.0000 XLM');
	});

	it('formats sub-1 XLM values with 4 decimal places', () => {
		expect(formatKeyPrice(5_000_000n)).toBe('0.5000 XLM');
		expect(formatKeyPrice(123_456n)).toBe('0.0123 XLM');
		expect(formatKeyPrice(123_556n)).toBe('0.0124 XLM'); // rounds up
	});

	it('formats exactly 1 XLM with 2 decimal places', () => {
		expect(formatKeyPrice(10_000_000n)).toBe('1.00 XLM');
	});

	it('formats large values with 2 decimal places and commas', () => {
		expect(formatKeyPrice(15_000_000n)).toBe('1.50 XLM');
		expect(formatKeyPrice(123_456_789n)).toBe('12.35 XLM');
		expect(formatKeyPrice(10_000_000_000n)).toBe('1,000.00 XLM');
	});
});
