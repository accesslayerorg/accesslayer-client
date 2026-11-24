import { AlertTriangle, Clock3 } from 'lucide-react';
import { useNowMs } from '@/hooks/useNowMs';
import { usePendingFeeChange } from '@/hooks/useFeeChange';
import { bpsToPercent } from '@/utils/numberFormat.utils';
import { formatCountdownDuration } from '@/utils/mergeProposal.utils';

export default function PendingFeeChangeBanner() {
	const pending = usePendingFeeChange();
	const nowMs = useNowMs(1000);

	if (!pending?.queuedFeeBps || !pending.eta) return null;

	const etaMs = new Date(pending.eta).getTime();
	const etaLabel = formatCountdownDuration(etaMs - nowMs);

	return (
		<div
			role="alert"
			aria-live="assertive"
			data-testid="pending-fee-change-banner"
			className="fixed inset-x-0 top-0 z-[96] flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-amber-500 px-4 py-3 text-center text-sm font-bold text-slate-950 shadow-lg"
		>
			<AlertTriangle className="size-5 shrink-0" aria-hidden="true" />
			<span data-testid="fee-change-title">Fee change pending</span>
			<span className="font-normal" data-testid="fee-change-current">
				Current: {bpsToPercent(pending.currentFeeBps)}
			</span>
			<span className="font-normal" data-testid="fee-change-queued">
				Queued: {bpsToPercent(pending.queuedFeeBps)}
			</span>
			<span
				className="flex items-center gap-1 font-normal"
				data-testid="fee-change-eta"
			>
				<Clock3 className="size-3.5" aria-hidden="true" />
				Executes in {etaLabel}
			</span>
		</div>
	);
}
