import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import type {
	CreatorRevenueSummary,
	CreatorWithdrawalRecord,
	CreatorWithdrawalResult,
	RevenueTimeRange,
} from '@/types/creatorRevenue';
import {
	fetchCreatorRevenueHistory,
	fetchCreatorRevenueSummary,
	fetchCreatorWithdrawals,
	submitCreatorWithdrawal,
} from '@/services/creatorRevenue.service';
import showToast from '@/utils/toast.util';
import { getSignatureErrorMessage } from '@/utils/errorHandling.utils';
import { aggregateRevenueSummary } from '@/utils/creatorRevenue.utils';

export const REVENUE_REFETCH_INTERVAL_MS = 60_000; // 60 seconds

export interface UseCreatorRevenueSummaryOptions {
	refetchInterval?: number;
	enabled?: boolean;
}

/**
 * Fetches the revenue breakdown for a creator.
 * Automatically refreshes every 60 seconds by default.
 */
export function useCreatorRevenueSummary(
	creatorId: string | undefined,
	options: UseCreatorRevenueSummaryOptions = {}
) {
	const {
		refetchInterval = REVENUE_REFETCH_INTERVAL_MS,
		enabled = Boolean(creatorId),
	} = options;

	return useQuery({
		queryKey: queryKeys.creatorRevenue.summary(creatorId ?? ''),
		queryFn: async () => {
			if (!creatorId) {
				return aggregateRevenueSummary('');
			}
			return fetchCreatorRevenueSummary(creatorId);
		},
		enabled,
		refetchInterval,
		refetchIntervalInBackground: false,
		staleTime: 15_000,
	});
}

export interface UseCreatorRevenueHistoryOptions {
	refetchInterval?: number;
	enabled?: boolean;
}

/**
 * Fetches time-series revenue breakdown points for a creator and time range.
 * Automatically refreshes every 60 seconds by default.
 */
export function useCreatorRevenueHistory(
	creatorId: string | undefined,
	interval: RevenueTimeRange = '24h',
	options: UseCreatorRevenueHistoryOptions = {}
) {
	const {
		refetchInterval = REVENUE_REFETCH_INTERVAL_MS,
		enabled = Boolean(creatorId),
	} = options;

	return useQuery({
		queryKey: queryKeys.creatorRevenue.history(creatorId ?? '', interval),
		queryFn: async () => {
			if (!creatorId) return [];
			return fetchCreatorRevenueHistory(creatorId, interval);
		},
		enabled,
		refetchInterval,
		refetchIntervalInBackground: false,
		staleTime: 15_000,
	});
}

/**
 * Fetches the list of confirmed withdrawal records for a creator.
 */
export function useCreatorWithdrawalHistory(creatorId: string | undefined) {
	return useQuery({
		queryKey: queryKeys.creatorRevenue.withdrawals(creatorId ?? ''),
		queryFn: async () => {
			if (!creatorId) return [];
			return fetchCreatorWithdrawals(creatorId);
		},
		enabled: Boolean(creatorId),
		staleTime: 15_000,
	});
}

export interface UseWithdrawCreatorRevenueMutationOptions {
	onSuccess?: (result: CreatorWithdrawalResult) => void;
	onError?: (error: unknown) => void;
}

/**
 * Mutation hook to submit a claim / withdrawal transaction for net creator proceeds.
 * On success, immediately invalidates revenue and withdrawal queries and confirms via toast.
 */
export function useWithdrawCreatorRevenueMutation(
	creatorId: string,
	wallet?: string,
	options: UseWithdrawCreatorRevenueMutationOptions = {}
) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ['creatorRevenue', 'withdraw', creatorId, wallet ?? ''],
		mutationFn: async (amount: number): Promise<CreatorWithdrawalResult> => {
			return submitCreatorWithdrawal(creatorId, amount, wallet);
		},
		onSuccess: (result: CreatorWithdrawalResult) => {
			// Optimistically prepend to withdrawal history in query cache
			queryClient.setQueryData<CreatorWithdrawalRecord[]>(
				queryKeys.creatorRevenue.withdrawals(creatorId),
				(old = []) => [result.record, ...old]
			);

			// Update summary in cache optimistically
			queryClient.setQueryData<CreatorRevenueSummary>(
				queryKeys.creatorRevenue.summary(creatorId),
				old => {
					if (!old) return old;
					const newClaimable = Math.max(
						0,
						old.claimableProceeds - result.amount
					);
					const newWithdrawn = old.totalWithdrawn + result.amount;
					return {
						...old,
						claimableProceeds: newClaimable,
						totalWithdrawn: newWithdrawn,
						lastUpdated: Date.now(),
					};
				}
			);

			// Invalidate queries to ensure sync
			void queryClient.invalidateQueries({
				queryKey: queryKeys.creatorRevenue.all(),
			});

			showToast.success(
				`Successfully withdrawn ${result.amount.toFixed(2)} XLM in proceeds!`
			);
			options.onSuccess?.(result);
		},
		onError: (error: unknown) => {
			showToast.error(getSignatureErrorMessage(error));
			options.onError?.(error);
		},
	});
}

/**
 * Hook to manage selected time range and active interval for the revenue chart.
 */
export function useRevenueTimeRange(initial: RevenueTimeRange = '24h') {
	const [interval, setInterval] = useState<RevenueTimeRange>(initial);

	const selectInterval = useCallback((newInterval: RevenueTimeRange) => {
		setInterval(newInterval);
	}, []);

	return { interval, selectInterval };
}
