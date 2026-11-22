import { describe, expect, it } from 'vitest';
import {
	calculateMintProgress,
	formatMintPercentage,
} from '@/utils/mintProgress.utils';

describe('formatMintPercentage', () => {
	it('formats 0% correctly for zero current supply', () => {
		expect(formatMintPercentage(0, 100)).toBe('0%');
	});

	it('formats partial percentage correctly', () => {
		expect(formatMintPercentage(50, 100)).toBe('50%');
		expect(formatMintPercentage(25, 100)).toBe('25%');
		expect(formatMintPercentage(33, 100)).toBe('33%');
	});

	it('formats exactly at cap as 100%', () => {
		expect(formatMintPercentage(100, 100)).toBe('100%');
		expect(formatMintPercentage(500, 500)).toBe('100%');
	});

	it('formats over cap safely as 100%', () => {
		expect(formatMintPercentage(105, 100)).toBe('100%');
		expect(formatMintPercentage(200, 100)).toBe('100%');
	});

	it('handles tiny fractions safely without divide-by-zero or showing 0%', () => {
		// 1 out of 2,000 = 0.05%
		expect(formatMintPercentage(1, 2000)).toBe('0.05%');
		// 1 out of 1,000 = 0.1%
		expect(formatMintPercentage(1, 1000)).toBe('0.1%');
		// 1 out of 200 = 0.5%
		expect(formatMintPercentage(1, 200)).toBe('0.5%');
		// very small fraction
		expect(formatMintPercentage(1, 100000)).toBe('<0.01%');
	});

	it('does not show 100% unless supply has actually reached the cap', () => {
		// 999 out of 1000 is 99.9%
		expect(formatMintPercentage(999, 1000)).toBe('99.9%');
		// 9999 out of 10000 is 99.99% - must not round to 100%
		expect(formatMintPercentage(9999, 10000)).toBe('99.9%');
	});

	it('handles invalid / non-positive max gracefully', () => {
		expect(formatMintPercentage(50, 0)).toBe('0%');
		expect(formatMintPercentage(50, -10)).toBe('0%');
	});

	it('handles negative current gracefully', () => {
		expect(formatMintPercentage(-5, 100)).toBe('0%');
	});
});

describe('calculateMintProgress', () => {
	it('identifies uncapped keys when maxSupply is null, undefined, 0, or negative', () => {
		expect(calculateMintProgress(50, null)).toEqual({
			isCapped: false,
			currentSupply: 50,
			maxSupply: null,
			remaining: 0,
			percentage: 0,
			percentageLabel: '0%',
			isAtCap: false,
		});

		expect(calculateMintProgress(50, undefined).isCapped).toBe(false);
		expect(calculateMintProgress(50, 0).isCapped).toBe(false);
		expect(calculateMintProgress(50, -100).isCapped).toBe(false);
	});

	it('computes accurate current, max, remaining, and percentage for capped keys', () => {
		const result = calculateMintProgress(40, 100);
		expect(result).toEqual({
			isCapped: true,
			currentSupply: 40,
			maxSupply: 100,
			remaining: 60,
			percentage: 40,
			percentageLabel: '40%',
			isAtCap: false,
		});
	});

	it('computes remaining accurately and never allows it to be negative', () => {
		expect(calculateMintProgress(100, 100).remaining).toBe(0);
		expect(calculateMintProgress(120, 100).remaining).toBe(0);
		expect(calculateMintProgress(99, 100).remaining).toBe(1);
	});

	it('sets isAtCap to true when currentSupply >= maxSupply', () => {
		expect(calculateMintProgress(99, 100).isAtCap).toBe(false);
		expect(calculateMintProgress(100, 100).isAtCap).toBe(true);
		expect(calculateMintProgress(105, 100).isAtCap).toBe(true);
	});

	it('clamps percentage between 0 and 100', () => {
		expect(calculateMintProgress(-10, 100).percentage).toBe(0);
		expect(calculateMintProgress(0, 100).percentage).toBe(0);
		expect(calculateMintProgress(50, 100).percentage).toBe(50);
		expect(calculateMintProgress(150, 100).percentage).toBe(100);
	});

	it('handles edge case when currentSupply is undefined or null', () => {
		const result = calculateMintProgress(null, 100);
		expect(result.currentSupply).toBe(0);
		expect(result.remaining).toBe(100);
		expect(result.percentage).toBe(0);
		expect(result.percentageLabel).toBe('0%');
		expect(result.isAtCap).toBe(false);
	});
});
