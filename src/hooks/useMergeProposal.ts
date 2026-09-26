import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { mergeProposalService } from '@/services/mergeProposal.service';
import { isVotingOpen } from '@/utils/mergeProposal.utils';
import type { MergeProposal, MergeVoteDirection } from '@/types/mergeProposal';
import showToast from '@/utils/toast.util';

/** How often the tally refetches while a merge vote is active (#983). */
export const MERGE_PROPOSAL_REFETCH_INTERVAL_MS = 30_000;

/**
 * Fetches the merge proposal (if any) for a source key. Polls every 30s
 * via React Query so the live vote tally and countdown stay in sync with
 * other holders' votes, without the user needing to refresh.
 */
export function useMergeProposal(sourceKeyId: string) {
	return useQuery({
		queryKey: queryKeys.mergeProposal.bySourceKey(sourceKeyId),
		queryFn: () => mergeProposalService.getMergeProposal(sourceKeyId),
		enabled: Boolean(sourceKeyId),
		staleTime: 20_000,
		// Only keep polling while a proposal is actually open for voting;
		// once it's closed there's nothing left to converge on.
		refetchInterval: query => {
			const proposal = query.state.data;
			if (!proposal) return MERGE_PROPOSAL_REFETCH_INTERVAL_MS;
			return isVotingOpen(proposal)
				? MERGE_PROPOSAL_REFETCH_INTERVAL_MS
				: false;
		},
	});
}

function errorMessage(error: unknown): string {
	return error instanceof Error
		? error.message
		: 'Your vote could not be submitted. Please try again.';
}

/**
 * Casts an approve/reject vote on a merge proposal and optimistically
 * reflects it in the cached tally so the UI feels instant, reconciling
 * with the server response (or rolling back on failure).
 */
export function useCastMergeVote(sourceKeyId: string) {
	const queryClient = useQueryClient();
	const queryKey = queryKeys.mergeProposal.bySourceKey(sourceKeyId);

	return useMutation({
		mutationKey: ['mergeProposal', 'vote', sourceKeyId],
		mutationFn: ({
			proposalId,
			direction,
		}: {
			proposalId: string;
			direction: MergeVoteDirection;
		}) => mergeProposalService.castVote(proposalId, direction),
		onMutate: async ({ direction }) => {
			await queryClient.cancelQueries({ queryKey });
			const previous =
				queryClient.getQueryData<MergeProposal | null>(queryKey);

			if (previous) {
				queryClient.setQueryData<MergeProposal | null>(queryKey, {
					...previous,
					userVote: direction,
					approveWeight:
						previous.approveWeight +
						(direction === 'approve' ? 1 : 0),
					rejectWeight:
						previous.rejectWeight + (direction === 'reject' ? 1 : 0),
				});
			}

			return { previous };
		},
		onError: (error, _variables, context) => {
			if (context?.previous !== undefined) {
				queryClient.setQueryData(queryKey, context.previous);
			}
			showToast.error(errorMessage(error));
		},
		onSuccess: result => {
			queryClient.setQueryData<MergeProposal | null>(
				queryKey,
				result.proposal
			);
			showToast.success(
				result.direction === 'approve'
					? 'Vote to approve the merge submitted'
					: 'Vote to reject the merge submitted'
			);
		},
		onSettled: () => {
			void queryClient.invalidateQueries({ queryKey });
		},
	});
}
