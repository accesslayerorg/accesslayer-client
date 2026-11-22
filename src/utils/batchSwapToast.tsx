import toast from 'react-hot-toast';
import BatchSwapExecutedToast from '@/components/common/BatchSwapExecutedToast';
import type { BatchSwapReceipt } from '@/types/batchTrade.types';

const BATCH_SWAP_TOAST_DURATION_MS = 6_000;

/**
 * Displays the BatchSwapExecuted toast (#1155).
 * Shows a per-item summary of all settled trades and the aggregated cost.
 */
export function showBatchSwapExecutedToast(receipt: BatchSwapReceipt): string {
	toast.remove();
	return toast.custom(
		t => (
			<BatchSwapExecutedToast toastId={t.id} receipt={receipt} />
		),
		{ duration: BATCH_SWAP_TOAST_DURATION_MS }
	);
}

export default showBatchSwapExecutedToast;
