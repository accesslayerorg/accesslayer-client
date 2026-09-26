import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import showToast from '@/utils/toast.util';
import { getSignatureErrorMessage } from '@/utils/errorHandling.utils';

/**
 * Creator-facing `claim_royalties` contract call issued from the dashboard's
 * earnings section (issue #987).
 *
 * The on-chain wiring is not in the client yet, so the mutation simulates
 * signing latency and resolves — matching useCreatorContractActions'
 * submitContractCall convention. On success the royalties query is
 * invalidated so totals and claimed history refresh.
 */

const SIGN_LATENCY_MS = 1200;

async function submitClaimRoyalties(creatorId: string) {
	// In production this signs and submits `claim_royalties` with `creatorId`
	// via the connected wallet.
	void creatorId;
	await new Promise<void>(resolve => window.setTimeout(resolve, SIGN_LATENCY_MS));
	return { success: true as const };
}

export function useClaimRoyaltiesMutation(creatorId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ['contract', 'claim_royalties', creatorId],
		mutationFn: () => submitClaimRoyalties(creatorId),
		onError: error => {
			showToast.error(getSignatureErrorMessage(error));
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.creators.royalties(creatorId),
			});
			showToast.success('Royalties claimed');
		},
	});
}
