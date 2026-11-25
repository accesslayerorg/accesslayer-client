import { create } from 'zustand';
import { isFiatCurrency, type FiatCurrency } from '@/utils/fiatCurrency.utils';

export const CURRENCY_STORAGE_KEY = 'al:currency';

interface CurrencyPreferenceState {
	currency: FiatCurrency;
	setCurrency: (currency: FiatCurrency) => void;
}

function readStoredCurrency(): FiatCurrency {
	if (typeof window === 'undefined') return 'USD';
	const stored = window.localStorage.getItem(CURRENCY_STORAGE_KEY);
	return isFiatCurrency(stored) ? stored : 'USD';
}

export const useCurrencyPreference = create<CurrencyPreferenceState>(set => ({
	currency: readStoredCurrency(),
	setCurrency: currency => {
		window.localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
		set({ currency });
	},
}));
