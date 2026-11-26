import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { rageQuitService, type RageQuitResult } from '@/services/rageQuit.service';
import { queryKeys } from '@/lib/queryKeys';
import { buildStellarExpertTxUrl } from '@/constants/stellar';
import { env } from '@/utils/env.utils';
import showToast from '@/utils/toast.util';

/** Poll the rage-quit window every 10 s while it is open. */
const POLL_INTERVAL_MS = 10_000;

/**
 * Fetches rage-quit eligibility and window state, and exposes a mutation
 * to submit the rage-quit transaction (#1253).
 *
 * Only fetches when both proposalId and wallet are provided.
 */
export function useRageQuit(proposalId: string, wallet: string | undefined) {
	const queryClient = useQueryClient();
	const enabled = Boolean(proposalId && wallet);

	const statusQuery = useQuery({
		queryKey: queryKeys.governance.rageQuit(proposalId, wallet ?? ''),
		queryFn: () => rageQuitService.getRageQuitStatus(proposalId, wallet!),
		enabled,
		staleTime: 5_000,
		refetchInterval: data =>
			data?.isOpen ? POLL_INTERVAL_MS : false,
	});

	const submitMutation = useMutation<RageQuitResult, Error, { amount: number }>({
		mutationFn: ({ amount }) =>
			rageQuitService.submitRageQuit(proposalId, wallet!, amount),
		onSuccess: result => {
			void queryClient.invalidateQueries({
				queryKey: queryKeys.governance.rageQuit(proposalId, wallet ?? ''),
			});
			void queryClient.invalidateQueries({
				queryKey: queryKeys.governance.proposal(proposalId),
			});
			const txUrl = result.txHash
				? buildStellarExpertTxUrl(result.txHash, env.VITE_STELLAR_NETWORK)
				: undefined;
			showToast.transactionSuccess(
				'Rage-quit submitted',
				`${result.keysBurned} key(s) burned. ${result.amountPaid.toFixed(2)} XLM returned.`,
				result.txHash ?? undefined,
				txUrl
			);
		},
		onError: () => {
			showToast.error('Rage-quit failed. Please try again.');
		},
	});

	const status = statusQuery.data ?? null;

	return {
		rageQuitStatus: status,
		isLoading: statusQuery.isLoading,
		isError: statusQuery.isError,
		isWindowOpen: status?.isOpen ?? false,
		eligibility: status?.eligibility ?? 'unknown',
		payoutPerKey: status?.payoutPerKey ?? null,
		windowEndsAt: status?.windowEndsAt ?? null,
		exitedFraction: status?.exitedFraction ?? 0,
		maxExitFraction: status?.maxExitFraction ?? 0,
		isSubmitting: submitMutation.isPending,
		submitRageQuit: (amount: number) => submitMutation.mutate({ amount }),
	};
}
