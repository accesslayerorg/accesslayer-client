import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBatchTradeStore } from '@/hooks/useBatchTradeStore';
import {
	buildBatchSwapPayload,
	estimateBatchItemCost,
	sumBatchTotalCostStroops,
} from '@/utils/batchTrade.utils';
import { submitCreatorContractCall } from '@/hooks/useCreatorContractActions';
import { queryKeys } from '@/lib/queryKeys';
import showToast from '@/utils/toast.util';
import { getSignatureErrorMessage } from '@/utils/errorHandling.utils';
import { showBatchSwapExecutedToast } from '@/utils/batchSwapToast';
import type {
	BatchSwapPayload,
	BatchSwapReceipt,
} from '@/types/batchTrade.types';

/**
 * Submits the `batch_swap` contract call (#1155).
 * Exported so unit/integration tests can spy on or mock the submission.
 */
export async function submitBatchSwap(payload: BatchSwapPayload) {
	return submitCreatorContractCall('batch_swap', payload);
}

/**
 * Hook to submit all queued orders in the batch trade drawer as a single
 * atomic `batch_swap` transaction.
 *
 * On confirmation, clears the batch trade queue, invalidates related caches,
 * and displays the `BatchSwapExecuted` toast with a per-item summary.
 */
export function useBatchSwapMutation() {
	const queryClient = useQueryClient();
	const clearBatch = useBatchTradeStore(state => state.clearBatch);
	const closeDrawer = useBatchTradeStore(state => state.closeDrawer);

	return useMutation({
		mutationKey: ['contract', 'batch_swap'],
		mutationFn: async () => {
			const { items } = useBatchTradeStore.getState();
			if (items.length === 0) {
				throw new Error('Batch trade queue is empty');
			}
			const payload = buildBatchSwapPayload(items);
			const result = await submitBatchSwap(payload);
			return { result, itemsSnapshot: [...items] };
		},
		onError: error => {
			showToast.error(getSignatureErrorMessage(error));
		},
		onSuccess: ({ itemsSnapshot }) => {
			const totalCostSummary = sumBatchTotalCostStroops(itemsSnapshot);
			const receipt: BatchSwapReceipt = {
				success: true,
				transactionHash: `swap-${Date.now().toString(16)}`,
				items: itemsSnapshot.map(item => ({
					keyId: item.keyId,
					keyName: item.keyName,
					direction: item.direction,
					amount: item.amount,
					costStroops: estimateBatchItemCost(item).netCostStroops,
					success: true,
				})),
				totalCostStroops: totalCostSummary.totalEstimatedCostStroops,
			};

			clearBatch();
			closeDrawer();

			void queryClient.invalidateQueries({
				queryKey: queryKeys.creators.all,
			});
			void queryClient.invalidateQueries({
				queryKey: ['wallet', 'holdings'],
			});

			showBatchSwapExecutedToast(receipt);
		},
	});
}
