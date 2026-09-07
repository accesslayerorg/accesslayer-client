import { useQuery } from '@tanstack/react-query';
import { governanceService } from '@/services/governance.service';
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
