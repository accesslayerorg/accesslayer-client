import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { convictionService } from '@/services/conviction.service';
import type {
	ConvictionBalances,
	ConvictionProjection,
	ConvictionProposal,
} from '@/types/conviction';
import {
	calculateConvictionProjection,
	getMaxStakeForProposal,
} from '@/utils/conviction.utils';
import showToast from '@/utils/toast.util';

export interface UseConvictionResult {
	/** Current accumulated conviction. */
	conviction: number;
	/** Conviction threshold required to pass. */
	threshold: number;
	/** User's currently allocated stake to this proposal. */
	stake: number;
	/** Total stake across all users. */
	totalStake: number;
	/** Full proposal data. */
	proposal: ConvictionProposal | undefined;
	/** User balances. */
	balances: ConvictionBalances | undefined;
	/** Unallocated balance across all active proposals. */
	unallocatedBalance: number;
	/** Max stake the user could allocate to this proposal. */
	maxStake: number;
	/** Conviction growth & crossing projection. */
	projection: ConvictionProjection;
	/** Whether the threshold has been crossed. */
	isThresholdCrossed: boolean;
	/** Whether the proposal is executed. */
	isExecuted: boolean;
	/** Allocate stake mutation. */
	allocateStake: (amount: number) => Promise<ConvictionProposal>;
	/** Withdraw stake mutation. */
	withdrawStake: (amount?: number) => Promise<ConvictionProposal>;
	/** Execute proposal mutation. */
	executeProposal: () => Promise<ConvictionProposal>;
	/** Loading state. */
	isLoading: boolean;
	/** Mutation pending state. */
	isMutating: boolean;
	/** Query error if any. */
	error: Error | null;
}

export function useConviction(
	proposalId: string,
	userAddress?: string
): UseConvictionResult {
	const queryClient = useQueryClient();

	const proposalQuery = useQuery({
		queryKey: queryKeys.conviction.proposal(proposalId),
		queryFn: () => convictionService.getProposal(proposalId),
		enabled: Boolean(proposalId),
	});

	const balancesQuery = useQuery({
		queryKey: queryKeys.conviction.balances(userAddress),
		queryFn: () => convictionService.getUserBalances(userAddress),
	});

	const allocateMutation = useMutation({
		mutationFn: (amount: number) =>
			convictionService.allocateStake(proposalId, amount, userAddress),
		onSuccess: updated => {
			showToast.success(`Allocated ${updated.userStake} stake to proposal`);
			void queryClient.invalidateQueries({
				queryKey: queryKeys.conviction.all(),
			});
		},
		onError: (err: Error) => {
			showToast.error(err.message || 'Failed to allocate stake');
		},
	});

	const withdrawMutation = useMutation({
		mutationFn: (amount?: number) =>
			convictionService.withdrawStake(proposalId, amount, userAddress),
		onSuccess: _updated => {
			showToast.success(
				`Withdrawn stake. Note: conviction decays gradually after withdrawal.`
			);
			void queryClient.invalidateQueries({
				queryKey: queryKeys.conviction.all(),
			});
		},
		onError: (err: Error) => {
			showToast.error(err.message || 'Failed to withdraw stake');
		},
	});

	const executeMutation = useMutation({
		mutationFn: () =>
			convictionService.executeProposal(proposalId, userAddress),
		onSuccess: () => {
			showToast.success('Proposal executed successfully!');
			void queryClient.invalidateQueries({
				queryKey: queryKeys.conviction.all(),
			});
		},
		onError: (err: Error) => {
			showToast.error(err.message || 'Failed to execute proposal');
		},
	});

	const proposal = proposalQuery.data ?? undefined;
	const balances = balancesQuery.data;

	const conviction = proposal?.currentConviction ?? 0;
	const threshold = proposal?.threshold ?? 0;
	const stake = proposal?.userStake ?? 0;
	const totalStake = proposal?.totalStake ?? 0;
	const unallocatedBalance = balances?.unallocatedBalance ?? 0;
	const maxStake = getMaxStakeForProposal(unallocatedBalance, stake);

	const projection = calculateConvictionProjection(
		conviction,
		threshold,
		totalStake,
		proposal?.alpha
	);

	const isThresholdCrossed = conviction >= threshold && threshold > 0;
	const isExecuted = proposal?.status === 'executed';

	return {
		conviction,
		threshold,
		stake,
		totalStake,
		proposal,
		balances,
		unallocatedBalance,
		maxStake,
		projection,
		isThresholdCrossed,
		isExecuted,
		allocateStake: allocateMutation.mutateAsync,
		withdrawStake: withdrawMutation.mutateAsync,
		executeProposal: executeMutation.mutateAsync,
		isLoading: proposalQuery.isLoading || balancesQuery.isLoading,
		isMutating:
			allocateMutation.isPending ||
			withdrawMutation.isPending ||
			executeMutation.isPending,
		error: (proposalQuery.error as Error) || null,
	};
}

/**
 * Hook to fetch all conviction proposals.
 */
export function useConvictionProposals(userAddress?: string) {
	const queryClient = useQueryClient();

	const proposalsQuery = useQuery({
		queryKey: queryKeys.conviction.proposals(),
		queryFn: () => convictionService.getProposals(),
	});

	const balancesQuery = useQuery({
		queryKey: queryKeys.conviction.balances(userAddress),
		queryFn: () => convictionService.getUserBalances(userAddress),
	});

	return {
		proposals: proposalsQuery.data ?? [],
		balances: balancesQuery.data,
		isLoading: proposalsQuery.isLoading || balancesQuery.isLoading,
		error: proposalsQuery.error as Error | null,
		refetch: () =>
			queryClient.invalidateQueries({ queryKey: queryKeys.conviction.all() }),
	};
}
