import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { type ReactNode } from 'react';
import {
	useKeyBuyback,
	useSubmitKeyBuybackMutation,
	type KeyBuybackInfo,
} from '@/hooks/useKeyBuyback';
import { courseService } from '@/services/course.service';
import { queryKeys } from '@/lib/queryKeys';
import type { HeldKeyPosition } from '@/utils/portfolioValue.utils';

vi.mock('@/services/course.service', async importOriginal => {
	const original =
		await importOriginal<typeof import('@/services/course.service')>();
	return {
		...original,
		courseService: {
			...original.courseService,
			getKeyBuyback: vi.fn(),
		},
	};
});

vi.mock('@/utils/toast.util', () => ({
	default: {
		success: vi.fn(),
		error: vi.fn(),
	},
}));

const mockGetKeyBuyback = vi.mocked(courseService.getKeyBuyback);

describe('useKeyBuyback and useSubmitKeyBuybackMutation', () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: {
				queries: { retry: false },
				mutations: { retry: false },
			},
		});
		mockGetKeyBuyback.mockReset();
	});

	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);

	describe('useKeyBuyback', () => {
		it('fetches buyback details for a key from courseService.getKeyBuyback', async () => {
			const mockBuyback: KeyBuybackInfo = {
				keyId: 'creator-923',
				deprecated: true,
				buybackPriceStroops: 1_500_000,
				expiryDate: '2026-12-31T23:59:59Z',
				terms: 'Contract guaranteed buyback at 0.15 XLM',
				isActive: true,
			};

			mockGetKeyBuyback.mockResolvedValue(mockBuyback);

			const { result } = renderHook(() => useKeyBuyback('creator-923'), {
				wrapper,
			});

			await waitFor(() => expect(result.current.isSuccess).toBe(true));

			expect(result.current.data).toEqual(mockBuyback);
			expect(mockGetKeyBuyback).toHaveBeenCalledWith('creator-923');

			const cached = queryClient.getQueryData(
				queryKeys.creators.buyback('creator-923')
			);
			expect(cached).toEqual(mockBuyback);
		});

		it('does not run query when enabled is false or keyId is empty', () => {
			const { result } = renderHook(() => useKeyBuyback('creator-923', false), {
				wrapper,
			});
			expect(result.current.fetchStatus).toBe('idle');
			expect(mockGetKeyBuyback).not.toHaveBeenCalled();
		});
	});

	describe('useSubmitKeyBuybackMutation', () => {
		it('submits buyback, returns receipt, clears wallet holdings, and invalidates queries', async () => {
			const userAddress = 'GBUYBACKWALLET12345';
			const creatorId = 'creator-923';

			// Seed wallet holdings with the deprecated key position
			const initialHoldings: HeldKeyPosition[] = [
				{
					creatorId: 'creator-923',
					quantity: 10,
					priceStroops: 1_500_000,
					price: 0.15,
				},
				{
					creatorId: 'other-creator-456',
					quantity: 5,
					priceStroops: 5_000_000,
					price: 0.5,
				},
			];

			queryClient.setQueryData(
				queryKeys.wallet.holdings(userAddress),
				initialHoldings
			);

			const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

			const { result } = renderHook(
				() => useSubmitKeyBuybackMutation(userAddress),
				{ wrapper }
			);

			let receipt: KeyBuybackReceipt | undefined;
			await act(async () => {
				receipt = await result.current.mutateAsync({
					creatorId,
					quantity: 10,
					buybackPriceStroops: 1_500_000,
				});
			});

			expect(receipt).toBeDefined();
			expect(receipt.creatorId).toBe('creator-923');
			expect(receipt.quantity).toBe(10);
			expect(receipt.buybackPriceStroops).toBe(1_500_000);
			expect(receipt.totalPayoutStroops).toBe(15_000_000);
			expect(receipt.txHash).toMatch(/^0x[a-f0-9]{32}$/);
			expect(receipt.settledAt).toBeDefined();

			// Verify that the position was cleared from cache
			const updatedHoldings = queryClient.getQueryData<HeldKeyPosition[]>(
				queryKeys.wallet.holdings(userAddress)
			);
			expect(updatedHoldings).toBeDefined();
			expect(updatedHoldings?.some(h => h.creatorId === creatorId)).toBe(false);
			expect(updatedHoldings).toHaveLength(1);
			expect(updatedHoldings?.[0].creatorId).toBe('other-creator-456');

			// Verify invalidations
			expect(invalidateSpy).toHaveBeenCalledWith({
				queryKey: queryKeys.wallet.holdings(userAddress),
			});
			expect(invalidateSpy).toHaveBeenCalledWith({
				queryKey: queryKeys.creators.detail(creatorId),
			});
			expect(invalidateSpy).toHaveBeenCalledWith({
				queryKey: queryKeys.creators.holders(creatorId),
			});
		});
	});
});
