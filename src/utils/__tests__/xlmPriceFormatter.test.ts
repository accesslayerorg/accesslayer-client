import { describe, expect, it } from 'vitest';
import { formatXlmPrice } from '../numberFormat.utils';

describe('formatXlmPrice', () => {
	it('formats 10 XLM as "10.00 XLM"', () => {
		expect(formatXlmPrice(10)).toBe('10.00 XLM');
	});

	it('formats 0.5 XLM as "0.50 XLM"', () => {
		expect(formatXlmPrice(0.5)).toBe('0.50 XLM');
	});

	it('formats 0.001 XLM as "0.00 XLM" rounded to 2 decimal places', () => {
		expect(formatXlmPrice(0.001)).toBe('0.00 XLM');
	});

	it('formats 1000.999 XLM as "1001.00 XLM"', () => {
		expect(formatXlmPrice(1000.999)).toBe('1001.00 XLM');
	});

	it('formats 0 XLM as "0.00 XLM"', () => {
		expect(formatXlmPrice(0)).toBe('0.00 XLM');
	});
});
