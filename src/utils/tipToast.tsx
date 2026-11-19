import toast from 'react-hot-toast';
import TipSentToast from '@/components/common/TipSentToast';
import type { TipSentToastData } from '@/types/tip.types';

const TIP_SENT_TOAST_DURATION_MS = 6_000;

/**
 * Fires the TipSent toast notification when a tip is confirmed.
 */
export function showTipSentToast(data: TipSentToastData): string {
	toast.remove();
	return toast.custom(
		t => <TipSentToast toastId={t.id} data={data} />,
		{ duration: TIP_SENT_TOAST_DURATION_MS }
	);
}

export default showTipSentToast;
