import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { cacheManager } from '@/utils/cache.utils';
import showToast from '@/utils/toast.util';
import { getSignatureErrorMessage } from '@/utils/errorHandling.utils';
import type { CreatorMetadataChange } from '@/utils/creatorMetadata.utils';

/**
 * Creator-facing contract calls issued from the dashboard tabs
 * (`update_metadata` — #818, `configure_auction` / `cancel_auction` — #816,
 * `set_launch_penalty`, `set_max_buy_quantity`, `set_quorum_bps` — #828).
 *
 * The on-chain wiring is not in the client yet, so each mutation simulates
 * signing latency and resolves. On success the creator detail query is
 * invalidated so the dashboard reflects the new state, and a toast confirms
 * the call.
 */

const SIGN_LATENCY_MS = 1200;

async function submitContractCall(fn: string, args: unknown) {
	// In production this signs and submits `fn` with `args` via the wallet.
	void fn;
	void args;
	await new Promise<void>(resolve => window.setTimeout(resolve, SIGN_LATENCY_MS));
	return { success: true as const };
}

export interface AuctionConfigInput {
	price: number;
	supply: number;
}

export function useUpdateMetadataMutation(creatorId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ['contract', 'update_metadata', creatorId],
		mutationFn: (change: CreatorMetadataChange) =>
			submitContractCall('update_metadata', { creatorId, ...change }),
		onError: error => {
			showToast.error(getSignatureErrorMessage(error));
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.creators.detail(creatorId),
			});
			showToast.success('Profile metadata updated');
		},
	});
}

export function useConfigureAuctionMutation(creatorId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ['contract', 'configure_auction', creatorId],
		mutationFn: (input: AuctionConfigInput) =>
			submitContractCall('configure_auction', { creatorId, ...input }),
		onError: error => {
			showToast.error(getSignatureErrorMessage(error));
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.creators.detail(creatorId),
			});
			showToast.success('Auction configured');
		},
	});
}

export function useCancelAuctionMutation(creatorId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ['contract', 'cancel_auction', creatorId],
		mutationFn: () => submitContractCall('cancel_auction', { creatorId }),
		onError: error => {
			showToast.error(getSignatureErrorMessage(error));
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.creators.detail(creatorId),
			});
			showToast.success('Auction cancelled');
		},
	});
}

export function useSetLaunchPenaltyMutation(creatorId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ['contract', 'set_launch_penalty', creatorId],
		mutationFn: (penaltyBps: number) =>
			submitContractCall('set_launch_penalty', { creatorId, penaltyBps }),
		onError: error => {
			showToast.error(getSignatureErrorMessage(error));
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.creators.detail(creatorId),
			});
			showToast.success('Launch penalty updated');
		},
	});
}

export function useSetMaxBuyQuantityMutation(creatorId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ['contract', 'set_max_buy_quantity', creatorId],
		mutationFn: (maxBuyQuantity: number) =>
			submitContractCall('set_max_buy_quantity', { creatorId, maxBuyQuantity }),
		onError: error => {
			showToast.error(getSignatureErrorMessage(error));
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.creators.detail(creatorId),
			});
			showToast.success('Max buy quantity updated');
		},
	});
}

export function useSetQuorumBpsMutation(creatorId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ['contract', 'set_quorum_bps', creatorId],
		mutationFn: (quorumBps: number) =>
			submitContractCall('set_quorum_bps', { creatorId, quorumBps }),
		onError: error => {
			showToast.error(getSignatureErrorMessage(error));
		},
		onSuccess: () => {
			// Drop the 30s course cache entry so the refetch below returns the
			// freshly committed quorum and the slider reflects it immediately.
			cacheManager.invalidate(`course_${creatorId}`);
			queryClient.invalidateQueries({
				queryKey: queryKeys.creators.detail(creatorId),
			});
			showToast.success('Quorum threshold updated');
		},
	});
}
