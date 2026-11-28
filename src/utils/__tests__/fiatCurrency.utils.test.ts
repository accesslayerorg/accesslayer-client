import { describe, expect, it } from 'vitest';
import {
	convertXlmToFiat,
	formatFiatAmount,
	formatXlmAsFiat,
	FIAT_CURRENCIES,
} from '@/utils/fiatCurrency.utils';

describe('fiat currency utilities', () => {
	it('converts an XLM amount using the supplied spot rate', () => {
		expect(convertXlmToFiat(2.5, 0.12)).toBeCloseTo(0.3);
	});

	it('rejects invalid amounts and rates', () => {
		expect(convertXlmToFiat(Number.NaN, 1)).toBeNull();
		expect(convertXlmToFiat(1, 0)).toBeNull();
		expect(convertXlmToFiat(1, Number.POSITIVE_INFINITY)).toBeNull();
	});

	it.each([
		['USD', '$1,234.50', 2, '$3.00'],
		['EUR', '€1,234.50', 0.9, '€1.35'],
		['NGN', '₦1,234.50', 1500, '₦2,250.00'],
	] as const)(
		'converts and formats %s with its currency symbol and decimals',
		(currency, expected, rate, convertedExpected) => {
			expect(formatFiatAmount(1234.5, currency, 'en-US')).toBe(expected);
			expect(formatXlmAsFiat(1.5, rate, currency, 'en-US')).toBe(
				convertedExpected
			);
		}
	);

	it('supports only the currencies offered by the selector', () => {
		expect(FIAT_CURRENCIES).toEqual(['USD', 'EUR', 'NGN']);
	});
});
