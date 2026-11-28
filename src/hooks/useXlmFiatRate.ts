import { useQuery } from '@tanstack/react-query';
import type { FiatCurrency } from '@/utils/fiatCurrency.utils';

const COINGECKO_SIMPLE_PRICE_URL =
	'https://api.coingecko.com/api/v3/simple/price';
export const XLM_FIAT_RATE_STALE_TIME = 60_000;

export interface XlmFiatRate {
	rate: number;
	fetchedAt: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object';
}

async function fetchXlmFiatRate(currency: FiatCurrency): Promise<XlmFiatRate> {
	const url = new URL(COINGECKO_SIMPLE_PRICE_URL);
	url.searchParams.set('ids', 'stellar');
	url.searchParams.set('vs_currencies', currency.toLowerCase());

	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`XLM exchange rate request failed (${response.status})`);
	}

	const payload: unknown = await response.json();
	if (!isRecord(payload) || !isRecord(payload.stellar)) {
		throw new Error('XLM exchange rate response is invalid');
	}

	const rawRate = payload.stellar[currency.toLowerCase()];
	if (
		typeof rawRate !== 'number' ||
		!Number.isFinite(rawRate) ||
		rawRate <= 0
	) {
		throw new Error(
			'XLM exchange rate response did not contain a valid rate'
		);
	}

	return { rate: rawRate, fetchedAt: Date.now() };
}

export function useXlmFiatRate(currency: FiatCurrency) {
	return useQuery({
		queryKey: ['xlm-fiat-rate', currency],
		queryFn: () => fetchXlmFiatRate(currency),
		staleTime: XLM_FIAT_RATE_STALE_TIME,
	});
}
