import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
	rebalanceService,
	type RebalanceAllocationInput,
	type RebalancePreview,
} from '@/services/rebalance.service';
import { submitContractCall } from '@/hooks/useKeyBuyback';
import showToast from '@/utils/toast.util';
import { getSignatureErrorMessage } from '@/utils/errorHandling.utils';

/**
 * Requests a swap preview for a set of target allocations via
 * `get_rebalance_preview` (#1139). A mutation (not a query) because the
 * preview depends on the allocations the user just typed, not a cacheable
 * key.
 */
export function useRebalancePreviewMutation(wallet: string | undefined) {
	return useMutation<RebalancePreview, Error, RebalanceAllocationInput[]>({
		mutationKey: ['rebalance', 'preview', wallet],
		mutationFn: allocations => {
			if (!wallet) throw new Error('Wallet is required');
			return rebalanceService.getRebalancePreview(wallet, allocations);
		},
		onError: error => {
			showToast.error(getSignatureErrorMessage(error));
		},
	});
}

export interface ExecuteRebalanceReceipt {
	txHash: string;
	allocations: RebalanceAllocationInput[];
	swaps: RebalancePreview['swaps'];
	executedAt: string;
}

/**
 * Submits the `execute_rebalance` contract call with the configured target
 * allocations, then invalidates the wallet's holdings so the portfolio
 * reflects the new balances (#1139).
 */
export function useExecuteRebalanceMutation(wallet: string | undefined) {
	const queryClient = useQueryClient();

	return useMutation<
		ExecuteRebalanceReceipt,
		Error,
		{ allocations: RebalanceAllocationInput[]; preview: RebalancePreview }
	>({
		mutationKey: ['contract', 'execute_rebalance', wallet],
		mutationFn: async ({ allocations, preview }) => {
			const res = await submitContractCall('execute_rebalance', {
				wallet,
				allocations,
			});

			return {
				txHash: res.txHash,
				allocations,
				swaps: preview.swaps,
				executedAt: new Date().toISOString(),
			};
		},
		onSuccess: () => {
			if (wallet) {
				queryClient.invalidateQueries({
					queryKey: queryKeys.wallet.holdings(wallet),
				});
			}
		},
		onError: error => {
			showToast.error(getSignatureErrorMessage(error));
		},
	});
}
