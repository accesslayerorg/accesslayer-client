import { beforeEach, describe, expect, it } from 'vitest';
import {
	CURRENCY_STORAGE_KEY,
	useCurrencyPreference,
} from '@/hooks/useCurrencyPreference';

describe('useCurrencyPreference', () => {
	beforeEach(() => {
		window.localStorage.removeItem(CURRENCY_STORAGE_KEY);
		useCurrencyPreference.setState({ currency: 'USD' });
	});

	it('defaults to USD when there is no saved preference', () => {
		expect(useCurrencyPreference.getState().currency).toBe('USD');
	});

	it('persists currency changes under the application preference key', () => {
		useCurrencyPreference.getState().setCurrency('EUR');

		expect(useCurrencyPreference.getState().currency).toBe('EUR');
		expect(window.localStorage.getItem(CURRENCY_STORAGE_KEY)).toBe('EUR');
	});
});
