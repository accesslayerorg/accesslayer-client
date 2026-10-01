import {
	useInfiniteQuery,
	useMutation,
	useQuery,
	useQueryClient,
} from '@tanstack/react-query';
import {
	fetchProposalVotesPage,
	governanceService,
} from '@/services/governance.service';
import {
	governanceContractService,
	GovernanceContractError,
	type SnapshotVotingWeight,
	type VoteTransactionResult,
} from '@/services/governanceContract.service';
import { queryKeys } from '@/lib/queryKeys';
import type { Signer } from '@/lib/signing/types';
import type { Proposal } from '@/types/governance';
import { buildStellarExpertTxUrl } from '@/constants/stellar';
import { env } from '@/utils/env.utils';
import {
	getSignatureErrorMessage,
	isUserRejection,
} from '@/utils/errorHandling.utils';
import showToast from '@/utils/toast.util';

/**
 * Fetches governance proposals, optionally filtered by creator.
 * Data refreshes every 15 seconds to keep quorum indicators current
 * without manual page reloads.
 */
export function useGovernanceProposals(creatorId?: string) {
	return useQuery({
		queryKey: queryKeys.governance.proposals(creatorId),
		queryFn: () => governanceService.getProposals(creatorId),
		/** 10 s stale time keeps the quorum bar responsive to votes. */
		staleTime: 10_000,
		/** 15 s refetch interval so the bar updates after a vote. */
		refetchInterval: 15_000,
	});
}

export function useGovernanceProposal(proposalId: string) {
	return useQuery({
		queryKey: queryKeys.governance.proposal(proposalId),
		queryFn: () => governanceService.getProposal(proposalId),
		enabled: Boolean(proposalId),
		staleTime: 10_000,
		refetchInterval: 15_000,
	});
}

export function useGovernanceProposalVotes(proposalId: string) {
	return useInfiniteQuery({
		queryKey: queryKeys.governance.proposalVotes(proposalId),
		queryFn: ({ pageParam }) =>
			fetchProposalVotesPage(
				proposalId,
				pageParam as string | null | undefined
			),
		initialPageParam: null as string | null,
		getNextPageParam: lastPage => lastPage.nextCursor ?? undefined,
		enabled: Boolean(proposalId),
	});
}

export function useProposalSnapshotWeight(
	proposal: Proposal | undefined,
	voter: string | undefined
) {
	return useQuery<SnapshotVotingWeight>({
		queryKey: queryKeys.governance.snapshot(
			proposal?.id ?? 'missing',
			voter ?? 'disconnected'
		),
		queryFn: () =>
			governanceContractService.getSnapshotVotingWeight(proposal!, voter!),
		enabled: Boolean(proposal && voter && proposal.status === 'active'),
		staleTime: 15_000,
		refetchInterval: 30_000,
		retry: false,
	});
}

interface CastProposalVoteInput {
	optionIndex: number;
}

export function useCastProposalVote({
	proposal,
	voter,
	signer,
}: {
	proposal: Proposal;
	voter: string | undefined;
	signer: Signer | null;
}) {
	const queryClient = useQueryClient();

	return useMutation<VoteTransactionResult, Error, CastProposalVoteInput>({
		mutationKey: queryKeys.governance.vote(proposal.id),
		mutationFn: ({ optionIndex }) =>
			governanceContractService.castVote({
				proposal,
				voter: voter!,
				optionIndex,
				signer: signer!,
			}),
		onSuccess: async result => {
			governanceService.clearCache();
			await queryClient.invalidateQueries({
				queryKey: queryKeys.governance.all(),
			});
			showToast.transactionSuccess(
				'Vote submitted',
				'Your vote was recorded on-chain.',
				result.hash ?? undefined,
				result.hash
					? buildStellarExpertTxUrl(result.hash, env.VITE_STELLAR_NETWORK)
					: undefined
			);
		},
		onError: error => {
			if (error instanceof GovernanceContractError) {
				showToast.error(error.message);
				return;
			}
			showToast.error(
				isUserRejection(error)
					? 'Vote cancelled.'
					: getSignatureErrorMessage(error)
			);
		},
	});
}
