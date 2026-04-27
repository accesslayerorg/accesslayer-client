import { describe, expect, it } from 'vitest';
import { formatPercent } from '@/utils/numberFormat.utils';

describe('formatPercent', () => {
	it('renders the value with a trailing percent sign', () => {
		expect(formatPercent(12.5)).toBe('12.5%');
	});

	it('rounds to two decimal places by default', () => {
		expect(formatPercent(12.345)).toBe('12.35%');
		expect(formatPercent(0.001)).toBe('0%');
	});

	it('renders zero cleanly without spurious decimals', () => {
		expect(formatPercent(0)).toBe('0%');
	});

	it('handles small decimals without scientific notation', () => {
		expect(formatPercent(0.05)).toBe('0.05%');
		expect(formatPercent(0.0001)).toBe('0%');
	});

	it('handles large values without truncation', () => {
		expect(formatPercent(123456)).toMatch(/123,?456%/);
	});

	it('returns the placeholder for null, undefined, NaN, and Infinity', () => {
		expect(formatPercent(null)).toBe('—');
		expect(formatPercent(undefined)).toBe('—');
		expect(formatPercent(Number.NaN)).toBe('—');
		expect(formatPercent(Number.POSITIVE_INFINITY)).toBe('—');
		expect(formatPercent(Number.NEGATIVE_INFINITY)).toBe('—');
	});

	it('respects a custom placeholder', () => {
		expect(formatPercent(null, { emptyPlaceholder: 'no data' })).toBe(
			'no data'
		);
	});

	it('prefixes positive values with + when signed=true', () => {
		expect(formatPercent(12.5, { signed: true })).toBe('+12.5%');
		expect(formatPercent(-12.5, { signed: true })).toBe('-12.5%');
		expect(formatPercent(0, { signed: true })).toBe('0%');
	});

	it('respects custom precision options', () => {
		expect(
			formatPercent(12.345, {
				maximumFractionDigits: 1,
				minimumFractionDigits: 1,
			})
		).toBe('12.3%');
		expect(
			formatPercent(12, {
				minimumFractionDigits: 2,
			})
		).toBe('12.00%');
	});
});
