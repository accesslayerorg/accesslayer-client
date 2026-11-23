import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
	fetchCreatorEarnings,
	submitEarningsClaim,
} from '@/services/creatorEarnings.service';
import { aggregateEarningsSummary } from '@/utils/creatorEarnings.utils';
import { EARNINGS_STREAM_LABELS } from '@/utils/creatorEarnings.utils';
import showToast from '@/utils/toast.util';
import { getSignatureErrorMessage } from '@/utils/errorHandling.utils';
import type {
	ClaimEarningsResult,
	CreatorEarningsSummary,
	EarningsStream,
} from '@/types/creatorEarnings';

export const EARNINGS_REFETCH_INTERVAL_MS = 60_000;

/**
 * Loads the creator's earnings breakdown across every stream, refreshing every
 * 60 seconds so balances stay current (#1258).
 */
export function useCreatorEarnings(creatorId: string | undefined) {
	return useQuery({
		queryKey: queryKeys.creatorEarnings.detail(creatorId ?? ''),
		queryFn: () => fetchCreatorEarnings(creatorId ?? ''),
		enabled: Boolean(creatorId),
		refetchInterval: EARNINGS_REFETCH_INTERVAL_MS,
		refetchIntervalInBackground: false,
		staleTime: 15_000,
	});
}

export interface ClaimEarningsInput {
	stream: EarningsStream;
	amountXlm: number;
}

/**
 * Submits a per-stream claim. On success the cached summary is updated in
 * place — the claimed stream's records flip to `claimed` and every total is
 * recomputed — and the query is invalidated to reconcile with the backend.
 */
export function useClaimEarningsStreamMutation(
	creatorId: string,
	wallet?: string
) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ['creatorEarnings', 'claim', creatorId, wallet ?? ''],
		mutationFn: ({ stream, amountXlm }: ClaimEarningsInput) =>
			submitEarningsClaim(creatorId, stream, amountXlm, wallet),
		onSuccess: (result: ClaimEarningsResult) => {
			queryClient.setQueryData<CreatorEarningsSummary>(
				queryKeys.creatorEarnings.detail(creatorId),
				old => {
					if (!old) return old;
					const records = old.records.map(record =>
						record.stream === result.stream &&
						record.status === 'unclaimed'
							? {
									...record,
									status: 'claimed' as const,
									transactionHash: result.transactionHash,
								}
							: record
					);
					return aggregateEarningsSummary(creatorId, records);
				}
			);

			void queryClient.invalidateQueries({
				queryKey: queryKeys.creatorEarnings.detail(creatorId),
			});

			showToast.success(
				`${EARNINGS_STREAM_LABELS[result.stream]} earnings claimed`
			);
		},
		onError: (error: unknown) => {
			showToast.error(getSignatureErrorMessage(error));
		},
	});
}
