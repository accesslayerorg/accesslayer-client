import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
	fetchCreatorEarnings,
	submitEarningsClaim,
} from '@/services/creatorEarnings.service';
import {
	applyClaimToSummary,
	EARNINGS_STREAM_LABELS,
} from '@/utils/creatorEarnings.utils';
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
export function useCreatorEarnings(
	creatorId: string | undefined,
	wallet: string | undefined
) {
	return useQuery({
		queryKey: queryKeys.creatorEarnings.detail(creatorId ?? '', wallet ?? ''),
		queryFn: () => fetchCreatorEarnings(creatorId ?? '', wallet ?? ''),
		enabled: Boolean(creatorId && wallet),
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
			const detailKey = queryKeys.creatorEarnings.detail(
				creatorId,
				wallet ?? ''
			);
			queryClient.setQueryData<CreatorEarningsSummary>(detailKey, old =>
				old
					? applyClaimToSummary(
							old,
							result.stream,
							result.amountXlm,
							result.transactionHash,
							result.claimedAt
						)
					: old
			);

			void queryClient.invalidateQueries({ queryKey: detailKey });

			showToast.success(
				`${EARNINGS_STREAM_LABELS[result.stream]} earnings claimed`
			);
		},
		onError: (error: unknown) => {
			showToast.error(getSignatureErrorMessage(error));
		},
	});
}
