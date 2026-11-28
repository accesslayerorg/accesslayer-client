import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import CurrencySelector from '@/components/common/CurrencySelector';
import FiatValue from '@/components/common/FiatValue';
import { XlmFiatRateProvider } from '@/components/common/XlmFiatRateProvider';
import {
	CURRENCY_STORAGE_KEY,
	useCurrencyPreference,
} from '@/hooks/useCurrencyPreference';

function renderWithRateProvider(children: ReactNode) {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	const result = render(
		<QueryClientProvider client={queryClient}>
			<XlmFiatRateProvider>{children}</XlmFiatRateProvider>
		</QueryClientProvider>
	);
	return { ...result, queryClient };
}

describe('FiatValue and CurrencySelector', () => {
	beforeEach(() => {
		vi.unstubAllGlobals();
		window.localStorage.removeItem(CURRENCY_STORAGE_KEY);
		useCurrencyPreference.setState({ currency: 'USD' });
		vi.restoreAllMocks();
	});

	it('updates every fiat value when the persisted currency changes', async () => {
		const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
			const quoteCurrency = new URL(input.toString()).searchParams.get(
				'vs_currencies'
			);
			const currency = quoteCurrency?.toUpperCase() ?? 'USD';
			const rates: Record<string, number> = { USD: 2, EUR: 0.9, NGN: 1500 };
			return {
				ok: true,
				status: 200,
				json: async () => ({
					stellar: { [currency.toLowerCase()]: rates[currency] },
				}),
			} as Response;
		});
		vi.stubGlobal('fetch', fetchMock);

		const { queryClient } = renderWithRateProvider(
			<>
				<CurrencySelector />
				<span>1.5 XLM</span>
				<FiatValue xlmAmount={1.5} />
				<FiatValue xlmAmount={2} />
			</>
		);

		await waitFor(() => {
			expect(screen.getAllByTestId('fiat-value')).toHaveLength(2);
		});
		expect(screen.getAllByTestId('fiat-value')[0]).toHaveTextContent('$3.00');
		expect(
			queryClient
				.getQueryCache()
				.find({ queryKey: ['xlm-fiat-rate', 'USD'] })?.options.staleTime
		).toBe(60_000);

		fireEvent.change(
			screen.getByRole('combobox', { name: 'Display currency' }),
			{
				target: { value: 'EUR' },
			}
		);

		await waitFor(() => {
			expect(screen.getAllByTestId('fiat-value')[0]).toHaveTextContent(
				'€1.35'
			);
			expect(screen.getAllByTestId('fiat-value')[1]).toHaveTextContent(
				'€1.80'
			);
		});
		expect(window.localStorage.getItem(CURRENCY_STORAGE_KEY)).toBe('EUR');
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it('loads the saved currency and shows rate source and update time', async () => {
		window.localStorage.setItem(CURRENCY_STORAGE_KEY, 'NGN');
		useCurrencyPreference.setState({ currency: 'NGN' });
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => ({ stellar: { ngn: 1500 } }),
			})
		);

		renderWithRateProvider(
			<>
				<CurrencySelector />
				<FiatValue xlmAmount={1} />
			</>
		);

		expect(
			screen.getByRole('combobox', { name: 'Display currency' })
		).toHaveValue('NGN');
		const fiatValue = await screen.findByTestId('fiat-value');
		fireEvent.mouseEnter(fiatValue);
		expect(screen.getByTestId('fiat-value')).toHaveTextContent('₦1,500.00');
		expect(screen.getByRole('tooltip')).toHaveTextContent(
			/Rate source: CoinGecko\. Last updated:/
		);
	});

	it('keeps XLM visible and shows a muted fallback when the rate request fails', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: false,
				status: 503,
				json: async () => ({}),
			})
		);

		renderWithRateProvider(
			<>
				<span>1.5 XLM</span>
				<FiatValue xlmAmount={1.5} />
			</>
		);

		expect(
			await screen.findByTestId('fiat-rate-unavailable')
		).toHaveTextContent('rate unavailable');
		expect(screen.getByText('1.5 XLM')).toBeInTheDocument();
		expect(screen.queryByTestId('fiat-value')).not.toBeInTheDocument();
	});
});
