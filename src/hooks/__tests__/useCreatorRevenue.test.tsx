import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { type ReactNode } from 'react';
import {
	useCreatorRevenueSummary,
	useCreatorRevenueHistory,
	useCreatorWithdrawalHistory,
	useWithdrawCreatorRevenueMutation,
	useRevenueTimeRange,
	REVENUE_REFETCH_INTERVAL_MS,
} from '../useCreatorRevenue';
import type {
	CreatorRevenueSummary,
	CreatorWithdrawalRecord,
	CreatorWithdrawalResult,
	RevenueHistoryPoint,
} from '@/types/creatorRevenue';

const mocks = vi.hoisted(() => ({
	fetchCreatorRevenueSummary: vi.fn(),
	fetchCreatorRevenueHistory: vi.fn(),
	fetchCreatorWithdrawals: vi.fn(),
	submitCreatorWithdrawal: vi.fn(),
	showToastSuccess: vi.fn(),
	showToastError: vi.fn(),
}));

vi.mock('@/services/creatorRevenue.service', () => ({
	fetchCreatorRevenueSummary: mocks.fetchCreatorRevenueSummary,
	fetchCreatorRevenueHistory: mocks.fetchCreatorRevenueHistory,
	fetchCreatorWithdrawals: mocks.fetchCreatorWithdrawals,
	submitCreatorWithdrawal: mocks.submitCreatorWithdrawal,
}));

vi.mock('@/utils/toast.util', () => ({
	default: {
		success: mocks.showToastSuccess,
		error: mocks.showToastError,
	},
}));

function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});

	return ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}

describe('useCreatorRevenue hooks', () => {
	const CREATOR_ID = 'creator-bob';

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('useCreatorRevenueSummary', () => {
		it('fetches summary data with 60s auto-refresh interval', async () => {
			const mockSummary: CreatorRevenueSummary = {
				creatorId: CREATOR_ID,
				royaltiesEarned: 300,
				subscriptionFees: 150,
				dividendDeposits: 50,
				totalEarnings: 500,
				claimableProceeds: 200,
				totalWithdrawn: 300,
				lastUpdated: Date.now(),
			};

			mocks.fetchCreatorRevenueSummary.mockResolvedValueOnce(mockSummary);

			const { result } = renderHook(
				() => useCreatorRevenueSummary(CREATOR_ID),
				{ wrapper: createWrapper() }
			);

			await waitFor(() => expect(result.current.isSuccess).toBe(true));

			expect(result.current.data?.totalEarnings).toBe(500);
			expect(result.current.data?.royaltiesEarned).toBe(300);
			expect(result.current.data?.subscriptionFees).toBe(150);
			expect(result.current.data?.dividendDeposits).toBe(50);
			expect(REVENUE_REFETCH_INTERVAL_MS).toBe(60_000);
		});
	});

	describe('useCreatorRevenueHistory', () => {
		it('fetches time-series data with 60s auto-refresh', async () => {
			const mockHistory: RevenueHistoryPoint[] = [
				{
					timestamp: '2026-09-28T12:00:00Z',
					royalties: 100,
					subscriptionFees: 50,
					dividendDeposits: 25,
					total: 175,
				},
			];

			mocks.fetchCreatorRevenueHistory.mockResolvedValueOnce(mockHistory);

			const { result } = renderHook(
				() => useCreatorRevenueHistory(CREATOR_ID, '24h'),
				{ wrapper: createWrapper() }
			);

			await waitFor(() => expect(result.current.isSuccess).toBe(true));

			expect(result.current.data).toEqual(mockHistory);
			expect(mocks.fetchCreatorRevenueHistory).toHaveBeenCalledWith(
				CREATOR_ID,
				'24h'
			);
		});
	});

	describe('useCreatorWithdrawalHistory', () => {
		it('fetches confirmed withdrawals', async () => {
			const mockWithdrawals: CreatorWithdrawalRecord[] = [
				{
					id: 'wd-1',
					creatorId: CREATOR_ID,
					amount: 150,
					timestamp: 1700000000000,
					transactionHash: 'hash-abc',
					status: 'confirmed',
				},
			];

			mocks.fetchCreatorWithdrawals.mockResolvedValueOnce(mockWithdrawals);

			const { result } = renderHook(
				() => useCreatorWithdrawalHistory(CREATOR_ID),
				{ wrapper: createWrapper() }
			);

			await waitFor(() => expect(result.current.isSuccess).toBe(true));

			expect(result.current.data).toEqual(mockWithdrawals);
		});
	});

	describe('useWithdrawCreatorRevenueMutation', () => {
		it('submits claim transaction and invalidates queries on success', async () => {
			const mockResult: CreatorWithdrawalResult = {
				success: true,
				transactionHash: '0x1234567890abcdef',
				claimedAt: 1700000000000,
				amount: 75,
				record: {
					id: 'wd-new',
					creatorId: CREATOR_ID,
					amount: 75,
					timestamp: 1700000000000,
					transactionHash: '0x1234567890abcdef',
					status: 'confirmed',
				},
			};

			mocks.submitCreatorWithdrawal.mockResolvedValueOnce(mockResult);

			const onSuccessMock = vi.fn();
			const { result } = renderHook(
				() =>
					useWithdrawCreatorRevenueMutation(CREATOR_ID, 'GWALLET', {
						onSuccess: onSuccessMock,
					}),
				{ wrapper: createWrapper() }
			);

			await act(async () => {
				result.current.mutate(75);
			});

			await waitFor(() => expect(result.current.isSuccess).toBe(true));

			expect(mocks.submitCreatorWithdrawal).toHaveBeenCalledWith(
				CREATOR_ID,
				75,
				'GWALLET'
			);
			expect(mocks.showToastSuccess).toHaveBeenCalled();
			expect(onSuccessMock).toHaveBeenCalledWith(mockResult);
		});
	});

	describe('useRevenueTimeRange', () => {
		it('updates active time interval', () => {
			const { result } = renderHook(() => useRevenueTimeRange('24h'));

			expect(result.current.interval).toBe('24h');

			act(() => {
				result.current.selectInterval('7d');
			});
			expect(result.current.interval).toBe('7d');

			act(() => {
				result.current.selectInterval('30d');
			});
			expect(result.current.interval).toBe('30d');

			act(() => {
				result.current.selectInterval('all');
			});
			expect(result.current.interval).toBe('all');
		});
	});
});
