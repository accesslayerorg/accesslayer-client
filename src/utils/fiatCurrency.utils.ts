export const FIAT_CURRENCIES = ['USD', 'EUR', 'NGN'] as const;

export type FiatCurrency = (typeof FIAT_CURRENCIES)[number];

export function isFiatCurrency(value: string | null): value is FiatCurrency {
	return FIAT_CURRENCIES.some(currency => currency === value);
}

export function convertXlmToFiat(
	xlmAmount: number,
	rate: number
): number | null {
	if (!Number.isFinite(xlmAmount) || !Number.isFinite(rate) || rate <= 0) {
		return null;
	}

	const fiatAmount = xlmAmount * rate;
	return Number.isFinite(fiatAmount) ? fiatAmount : null;
}

export function formatFiatAmount(
	amount: number,
	currency: FiatCurrency,
	locale?: string
): string {
	return new Intl.NumberFormat(locale, {
		style: 'currency',
		currency,
		currencyDisplay: 'narrowSymbol',
	}).format(amount);
}

export function formatXlmAsFiat(
	xlmAmount: number,
	rate: number,
	currency: FiatCurrency,
	locale?: string
): string | null {
	const fiatAmount = convertXlmToFiat(xlmAmount, rate);
	return fiatAmount == null
		? null
		: formatFiatAmount(fiatAmount, currency, locale);
}
