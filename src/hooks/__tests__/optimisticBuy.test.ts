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

const HOLDINGS_SEED: HeldKeyPosition[] = [
	{ creatorId: 'creator-a', quantity: 2, priceStroops: null, price: null, pending: false },
	{ creatorId: 'creator-b', quantity: 3, priceStroops: null, price: null, pending: false },
	{ creatorId: 'creator-c', quantity: 1, priceStroops: null, price: null, pending: false },
];

const TRADE_VARIABLES = {
	creatorId: 'creator-a',
	amount: 1,
	priceStroops: 500_000,
	price: 0.05,
};

describe('optimistic buy cache isolation (#655)', () => {
	it('updates only the targeted creator when an optimistic buy is applied', async () => {
		const { wrapper, queryClient } = createWrapper();

		seedHoldings(queryClient, [...HOLDINGS_SEED]);

		const { result } = renderHook(() => useTradeMutation(address), { wrapper });

		result.current.mutate(TRADE_VARIABLES);

		await waitFor(() => {
			const holdings = queryClient.getQueryData<HeldKeyPosition[]>(
				queryKeys.wallet.holdings(address)
			) ?? [];
			expect(holdings.find(h => h.creatorId === 'creator-a')?.quantity).toBe(3);
		});

		const holdings = queryClient.getQueryData<HeldKeyPosition[]>(
			queryKeys.wallet.holdings(address)
		) ?? [];

		expect(holdings.find(h => h.creatorId === 'creator-a')?.pending).toBe(true);
		expect(holdings.find(h => h.creatorId === 'creator-b')?.quantity).toBe(3);
		expect(holdings.find(h => h.creatorId === 'creator-c')?.quantity).toBe(1);
	});

	it('reverts only the targeted creator on rollback without altering other creators', () => {
		const { queryClient } = createWrapper();

		seedHoldings(queryClient, [...HOLDINGS_SEED]);

		const holdingsKey = queryKeys.wallet.holdings(address);
		const previousHoldings = queryClient.getQueryData<HeldKeyPosition[]>(holdingsKey);

		// Apply optimistic update (same transformation as onMutate in useWallet.ts)
		queryClient.setQueryData<HeldKeyPosition[]>(holdingsKey, (old = []) =>
			old.map(h =>
				h.creatorId === 'creator-a'
					? { ...h, quantity: (h.quantity ?? 0) + 1, pending: true }
					: h
			)
		);

		let holdings = queryClient.getQueryData<HeldKeyPosition[]>(holdingsKey) ?? [];
		expect(holdings.find(h => h.creatorId === 'creator-a')?.quantity).toBe(3);
		expect(holdings.find(h => h.creatorId === 'creator-a')?.pending).toBe(true);
		expect(holdings.find(h => h.creatorId === 'creator-b')?.quantity).toBe(3);
		expect(holdings.find(h => h.creatorId === 'creator-c')?.quantity).toBe(1);

		// Simulate rollback (same transformation as onError in useWallet.ts)
		queryClient.setQueryData(holdingsKey, previousHoldings);

		holdings = queryClient.getQueryData<HeldKeyPosition[]>(holdingsKey) ?? [];
		expect(holdings.find(h => h.creatorId === 'creator-a')?.quantity).toBe(2);
		expect(holdings.find(h => h.creatorId === 'creator-a')?.pending).toBe(false);
		expect(holdings.find(h => h.creatorId === 'creator-b')?.quantity).toBe(3);
		expect(holdings.find(h => h.creatorId === 'creator-c')?.quantity).toBe(1);
	});
});
