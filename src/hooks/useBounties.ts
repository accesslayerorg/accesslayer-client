import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useWalletHoldings } from '@/hooks/useWallet';
import { queryKeys } from '@/lib/queryKeys';
import {
	awardSubmission,
	createBounty,
	getBounties,
	getBounty,
	getSubmissions,
	reclaimBounty,
	rejectSubmission,
	submitWork,
	type Bounty,
	type BountyFilters,
	type CreateBountyInput,
	type SubmitWorkInput,
} from '@/services/bounty.service';
import showToast from '@/utils/toast.util';

function message(error: unknown, fallback: string): string {
	return error instanceof Error ? error.message : fallback;
}

export function useBounties(filters: BountyFilters = {}) {
	return useQuery({
		queryKey: queryKeys.bounties.list(filters as Record<string, unknown>),
		queryFn: () => getBounties(filters),
		staleTime: 15_000,
	});
}

export function useBounty(bountyId: string | undefined) {
	return useQuery({
		queryKey: queryKeys.bounties.detail(bountyId ?? ''),
		queryFn: () => getBounty(bountyId ?? ''),
		enabled: Boolean(bountyId),
		staleTime: 15_000,
	});
}

export function useBountySubmissions(bountyId: string | undefined) {
	return useQuery({
		queryKey: queryKeys.bounties.submissions(bountyId ?? ''),
		queryFn: () => getSubmissions(bountyId ?? ''),
		enabled: Boolean(bountyId),
		staleTime: 10_000,
	});
}

export function useBountyEligibility(
	bounty: Bounty | undefined,
	wallet: string | undefined
) {
	const { data: holdings = [], isLoading } = useWalletHoldings(wallet ?? '');
	const isHolder = Boolean(
		bounty &&
		holdings.some(
			position =>
				position.creatorId === bounty.keyId && (position.quantity ?? 0) > 0
		)
	);

	let reason: string | null = null;
	if (bounty?.holderGated) {
		if (!wallet)
			reason = 'Connect your wallet to submit work on this bounty.';
		else if (!isHolder && !isLoading)
			reason = `You must hold ${bounty.keyName} to submit work on this bounty.`;
	}

	return {
		isHolder,
		isEligible: !bounty?.holderGated || Boolean(wallet && isHolder),
		reason,
		isLoading,
	};
}

function useInvalidateBounties() {
	const queryClient = useQueryClient();
	return () =>
		void queryClient.invalidateQueries({
			queryKey: queryKeys.bounties.all(),
		});
}

export function useCreateBounty(wallet: string | undefined) {
	const invalidate = useInvalidateBounties();
	return useMutation({
		mutationKey: ['bounty', 'create', wallet],
		mutationFn: async (input: CreateBountyInput) => {
			if (!wallet) throw new Error('Connect a wallet to post a bounty.');
			return createBounty(input, wallet);
		},
		onSuccess: () => {
			showToast.success('Bounty posted and rewards escrowed');
			invalidate();
		},
		onError: error =>
			showToast.error(message(error, 'Could not post bounty')),
	});
}

export function useSubmitWork() {
	const invalidate = useInvalidateBounties();
	return useMutation({
		mutationKey: ['bounty', 'submit-work'],
		mutationFn: async (input: SubmitWorkInput) => submitWork(input),
		onSuccess: () => {
			showToast.success('Work submitted');
			invalidate();
		},
		onError: error =>
			showToast.error(message(error, 'Could not submit work')),
	});
}

export function useAwardSubmission(wallet: string | undefined) {
	const invalidate = useInvalidateBounties();
	return useMutation({
		mutationKey: ['bounty', 'award', wallet],
		mutationFn: async (submissionId: string) => {
			if (!wallet) throw new Error('Connect the creator wallet to award.');
			return awardSubmission(submissionId, wallet);
		},
		onSuccess: () => {
			showToast.success('Winner awarded');
			invalidate();
		},
		onError: error => showToast.error(message(error, 'Could not award work')),
	});
}

export function useRejectSubmission(wallet: string | undefined) {
	const invalidate = useInvalidateBounties();
	return useMutation({
		mutationKey: ['bounty', 'reject', wallet],
		mutationFn: async (variables: {
			submissionId: string;
			reason?: string;
		}) => {
			if (!wallet) throw new Error('Connect the creator wallet to reject.');
			return rejectSubmission(
				variables.submissionId,
				wallet,
				variables.reason
			);
		},
		onSuccess: () => {
			showToast.success('Submission rejected — one resubmission allowed');
			invalidate();
		},
		onError: error =>
			showToast.error(message(error, 'Could not reject work')),
	});
}

export function useReclaimBounty(wallet: string | undefined) {
	const invalidate = useInvalidateBounties();
	return useMutation({
		mutationKey: ['bounty', 'reclaim', wallet],
		mutationFn: async (bountyId: string) => {
			if (!wallet) throw new Error('Connect the creator wallet to reclaim.');
			return reclaimBounty(bountyId, wallet);
		},
		onSuccess: result => {
			showToast.success(
				`Unpaid rewards reclaimed: ${result.reclaimedStroops.toLocaleString()} stroops`
			);
			invalidate();
		},
		onError: error =>
			showToast.error(message(error, 'Could not reclaim rewards')),
	});
}
