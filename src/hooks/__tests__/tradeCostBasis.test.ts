import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	recordTradeCostBasis,
	resolveBuyCostStroops,
	useTradeMutation,
	type TradeVariables,
} from '../useWallet';
import { queryKeys } from '@/lib/queryKeys';
import { useKeyCostBasis } from '@/hooks/useKeyCostBasis';
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

const ADDRESS = 'GCostBasisWallet';
const CREATOR = 'creator-a';

function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});

	return {
		queryClient,
		wrapper: function Wrapper({ children }: { children: React.ReactNode }) {
			return React.createElement(
				QueryClientProvider,
				{ client: queryClient },
				children
			);
		},
	};
}

const buyVariables: TradeVariables = {
	creatorId: CREATOR,
	amount: 2,
	priceStroops: 500_000,
	price: 0.05,
};

describe('resolveBuyCostStroops', () => {
	it('falls back to spot price times quantity when the curve is unknown', () => {
		expect(resolveBuyCostStroops(buyVariables)).toBe(1_000_000);
	});

	it('uses the bonding curve integral when curve parameters are known', () => {
		// Linear curve, 1 XLM base growing 1% per key. Buying 2 keys at supply
		// 0 costs the area under the curve: the price runs 10_000_000 to
		// 10_200_000, so 2 * 10_100_000 = 20_200_000 stroops.
		expect(
			resolveBuyCostStroops({
				...buyVariables,
				currentSupply: 0,
				curveBasePriceStroops: 10_000_000,
				curveGrowthFactor: 1.01,
			})
		).toBe(20_200_000);
	});

	it('returns null for a non-positive or unpriceable trade', () => {
		expect(resolveBuyCostStroops({ ...buyVariables, amount: 0 })).toBeNull();
		expect(
			resolveBuyCostStroops({ ...buyVariables, priceStroops: null })
		).toBeNull();
	});
});

describe('recordTradeCostBasis (#935)', () => {
	beforeEach(() => {
		useKeyCostBasis.getState().resetCostBasis(ADDRESS, CREATOR);
	});

	it('records a confirmed buy as a new cost basis', () => {
		recordTradeCostBasis(ADDRESS, buyVariables);

		expect(
			useKeyCostBasis
				.getState()
				.getAveragePurchasePriceStroops(ADDRESS, CREATOR)
		).toBe(500_000);
	});

	it('re-weights the average purchase price across repeated buys', () => {
		recordTradeCostBasis(ADDRESS, buyVariables);
		// Second buy: 2 keys at 1 XLM each.
		recordTradeCostBasis(ADDRESS, {
			...buyVariables,
			priceStroops: 1_000_000,
		});

		expect(
			useKeyCostBasis
				.getState()
				.getAveragePurchasePriceStroops(ADDRESS, CREATOR)
		).toBe(750_000);
	});

	it('preserves the average purchase price of the keys left after a sell', () => {
		recordTradeCostBasis(ADDRESS, { ...buyVariables, amount: 10 });
		recordTradeCostBasis(ADDRESS, { ...buyVariables, amount: -4 });

		const remaining = useKeyCostBasis
			.getState()
			.getCostBasis(ADDRESS, CREATOR);

		expect(remaining?.quantity).toBe(6);
		expect(
			useKeyCostBasis
				.getState()
				.getAveragePurchasePriceStroops(ADDRESS, CREATOR)
		).toBe(500_000);
	});

	it('ignores a buy with no resolvable price', () => {
		recordTradeCostBasis(ADDRESS, { ...buyVariables, priceStroops: null });

		expect(
			useKeyCostBasis.getState().getCostBasis(ADDRESS, CREATOR)
		).toBeNull();
	});
});

describe('useTradeMutation cost basis wiring (#935)', () => {
	beforeEach(() => {
		useKeyCostBasis.getState().resetCostBasis(ADDRESS, CREATOR);
	});

	it('persists the cost basis only after the trade succeeds', async () => {
		const { wrapper, queryClient } = createWrapper();
		queryClient.setQueryData(queryKeys.wallet.holdings(ADDRESS), [
			{
				creatorId: CREATOR,
				quantity: 1,
				priceStroops: 500_000,
				price: 0.05,
			},
		] satisfies HeldKeyPosition[]);

		const { result } = renderHook(() => useTradeMutation(ADDRESS), {
			wrapper,
		});

		expect(
			useKeyCostBasis.getState().getCostBasis(ADDRESS, CREATOR)
		).toBeNull();

		await result.current.mutateAsync(buyVariables);

		await waitFor(() => {
			expect(
				useKeyCostBasis.getState().getCostBasis(ADDRESS, CREATOR)
			).toMatchObject({ costBasisStroops: 1_000_000, quantity: 2 });
		});
	});

	it('writes the re-weighted average purchase price into the optimistic cache', async () => {
		const { wrapper, queryClient } = createWrapper();
		queryClient.setQueryData(queryKeys.wallet.holdings(ADDRESS), [
			{
				creatorId: CREATOR,
				quantity: 2,
				priceStroops: 500_000,
				price: 0.05,
				averagePurchasePriceStroops: 500_000,
			},
		] satisfies HeldKeyPosition[]);

		const { result } = renderHook(() => useTradeMutation(ADDRESS), {
			wrapper,
		});

		await result.current.mutateAsync({
			...buyVariables,
			priceStroops: 1_000_000,
		});

		await waitFor(() => {
			const holdings = queryClient.getQueryData<HeldKeyPosition[]>(
				queryKeys.wallet.holdings(ADDRESS)
			);

			// (2 keys @ 0.5 XLM + 2 keys @ 1 XLM) / 4 keys = 0.75 XLM.
			expect(holdings?.[0].averagePurchasePriceStroops).toBe(750_000);
		});
	});
});
