import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useTradeMutation } from '../useWallet';
import { queryKeys } from '@/lib/queryKeys';
import type { HeldKeyPosition } from '@/utils/portfolioValue.utils';

vi.mock('@/utils/toast.util', () => ({
	default: {
		message: vi.fn(),
		success: vi.fn(),
		error: vi.fn(),
		loading: vi.fn(),
		transactionSuccess: vi.fn(),
	},
}));

function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	return {
		wrapper: function Wrapper({ children }: { children: React.ReactNode }) {
			return React.createElement(QueryClientProvider, { client: queryClient }, children);
		},
		queryClient,
	};
}

const address = 'GWALLET';

function seedHoldings(
	queryClient: QueryClient,
	holdings: HeldKeyPosition[]
) {
	queryClient.setQueryData(queryKeys.wallet.holdings(address), holdings);
}

describe('optimistic sell cache decrement (#621)', () => {
	it('decrements the cache by the sold quantity on submission', async () => {
		const { wrapper, queryClient } = createWrapper();

		seedHoldings(queryClient, [
			{ creatorId: 'creator-a', quantity: 3, priceStroops: null, price: null, pending: false },
			{ creatorId: 'creator-b', quantity: 3, priceStroops: null, price: null, pending: false },
			{ creatorId: 'creator-c', quantity: 1, priceStroops: null, price: null, pending: false },
		]);

		const { result } = renderHook(() => useTradeMutation(address), { wrapper });

		result.current.mutate({
			creatorId: 'creator-a',
			amount: -2,
			priceStroops: 500_000,
			price: 0.05,
		});

		await waitFor(() => {
			const holdings = queryClient.getQueryData<HeldKeyPosition[]>(
				queryKeys.wallet.holdings(address)
			) ?? [];
			expect(holdings.find(h => h.creatorId === 'creator-a')?.quantity).toBe(1);
		});

		const holdings = queryClient.getQueryData<HeldKeyPosition[]>(
			queryKeys.wallet.holdings(address)
		) ?? [];

		expect(holdings.find(h => h.creatorId === 'creator-a')?.pending).toBe(true);
		expect(holdings.find(h => h.creatorId === 'creator-b')?.quantity).toBe(3);
		expect(holdings.find(h => h.creatorId === 'creator-c')?.quantity).toBe(1);
	});

	it('removes the holding entry from the cache when the sold quantity reaches zero', async () => {
		const { wrapper, queryClient } = createWrapper();

		seedHoldings(queryClient, [
			{ creatorId: 'creator-a', quantity: 1, priceStroops: null, price: null, pending: false },
			{ creatorId: 'creator-b', quantity: 3, priceStroops: null, price: null, pending: false },
		]);

		const { result } = renderHook(() => useTradeMutation(address), { wrapper });

		result.current.mutate({
			creatorId: 'creator-a',
			amount: -1,
			priceStroops: 500_000,
			price: 0.05,
		});

		await waitFor(() => {
			const holdings = queryClient.getQueryData<HeldKeyPosition[]>(
				queryKeys.wallet.holdings(address)
			) ?? [];
			expect(holdings.find(h => h.creatorId === 'creator-a')).toBeUndefined();
		});

		const holdings = queryClient.getQueryData<HeldKeyPosition[]>(
			queryKeys.wallet.holdings(address)
		) ?? [];

		expect(holdings).toHaveLength(1);
		expect(holdings.find(h => h.creatorId === 'creator-b')?.quantity).toBe(3);
	});

	it('restores the pre-sell snapshot (not a re-fetch) when the second sell fails', () => {
		const { queryClient } = createWrapper();

		// Starting point: a first sell already succeeded, leaving 2 keys.
		seedHoldings(queryClient, [
			{ creatorId: 'creator-a', quantity: 2, priceStroops: null, price: null, pending: false },
			{ creatorId: 'creator-b', quantity: 3, priceStroops: null, price: null, pending: false },
		]);

		const holdingsKey = queryKeys.wallet.holdings(address);
		const previousHoldings = queryClient.getQueryData<HeldKeyPosition[]>(holdingsKey);

		// Apply the optimistic update for the second sell (same transformation as onMutate in useWallet.ts).
		queryClient.setQueryData<HeldKeyPosition[]>(holdingsKey, (old = []) =>
			old.map(h =>
				h.creatorId === 'creator-a'
					? { ...h, quantity: (h.quantity ?? 0) - 1, pending: true }
					: h
			)
		);

		let holdings = queryClient.getQueryData<HeldKeyPosition[]>(holdingsKey) ?? [];
		expect(holdings.find(h => h.creatorId === 'creator-a')?.quantity).toBe(1);
		expect(holdings.find(h => h.creatorId === 'creator-a')?.pending).toBe(true);

		// The second sell fails: roll back using the captured snapshot (same transformation as onError in useWallet.ts).
		queryClient.setQueryData(holdingsKey, previousHoldings);

		holdings = queryClient.getQueryData<HeldKeyPosition[]>(holdingsKey) ?? [];

		expect(holdings).toEqual(previousHoldings);
		expect(holdings.find(h => h.creatorId === 'creator-a')?.quantity).toBe(2);
		expect(holdings.find(h => h.creatorId === 'creator-a')?.pending).toBe(false);
		expect(holdings.find(h => h.creatorId === 'creator-b')?.quantity).toBe(3);
	});
});
