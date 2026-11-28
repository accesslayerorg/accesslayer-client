import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	useXlmFiatRate,
	XLM_FIAT_RATE_STALE_TIME,
} from '@/hooks/useXlmFiatRate';

function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});

	return {
		queryClient,
		Wrapper: ({ children }: { children: ReactNode }) => (
			<QueryClientProvider client={queryClient}>
				{children}
			</QueryClientProvider>
		),
	};
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('useXlmFiatRate', () => {
	it('fetches and caches the selected fiat quote for 60 seconds', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => ({ stellar: { eur: 0.11 } }),
		});
		vi.stubGlobal('fetch', fetchMock);
		const { Wrapper, queryClient } = createWrapper();

		const { result } = renderHook(() => useXlmFiatRate('EUR'), {
			wrapper: Wrapper,
		});

		await waitFor(() => {
			expect(result.current.data?.rate).toBe(0.11);
		});
		expect(result.current.data?.fetchedAt).toEqual(expect.any(Number));
		expect(fetchMock).toHaveBeenCalledOnce();
		expect(
			queryClient
				.getQueryCache()
				.find({ queryKey: ['xlm-fiat-rate', 'EUR'] })?.options.staleTime
		).toBe(XLM_FIAT_RATE_STALE_TIME);
		expect(XLM_FIAT_RATE_STALE_TIME).toBe(60_000);
	});

	it('returns an error when the exchange-rate request fails', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({ ok: false, status: 503 })
		);
		const { Wrapper } = createWrapper();

		const { result } = renderHook(() => useXlmFiatRate('USD'), {
			wrapper: Wrapper,
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});
		expect(result.current.data).toBeUndefined();
	});
});
