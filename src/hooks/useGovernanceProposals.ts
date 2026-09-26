import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
	fetchProposalVotesPage,
	governanceService,
} from '@/services/governance.service';
import { queryKeys } from '@/lib/queryKeys';

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
