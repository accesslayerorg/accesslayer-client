import { ArrowRight } from 'lucide-react';
import type { FeeChangeState } from '@/services/feeChange.service';
import { bpsToPercent } from '@/utils/numberFormat.utils';
import { formatDisplayKeyPrice } from '@/utils/keyPriceDisplay.utils';
import { cn } from '@/lib/utils';

export interface FeeImpactPreviewProps {
	pending: FeeChangeState;
	totalStroops?: number | null;
}

export default function FeeImpactPreview({
	pending,
	totalStroops,
}: FeeImpactPreviewProps) {
	if (!pending.queuedFeeBps) return null;

	const notional = Math.max(0, totalStroops ?? 0);
	const currentFeeStroops = Math.round(
		(notional * pending.currentFeeBps) / 10_000
	);
	const queuedFeeStroops = Math.round(
		(notional * pending.queuedFeeBps) / 10_000
	);
	const deltaStroops = queuedFeeStroops - currentFeeStroops;

	return (
		<div
			className={cn(
				'rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-3 text-xs text-amber-100/85'
			)}
			data-testid="fee-impact-preview"
		>
			<p className="font-semibold text-amber-300">Queued fee change</p>
			<div className="mt-2 flex flex-wrap items-center gap-2">
				<span data-testid="fee-impact-current-rate">
					{bpsToPercent(pending.currentFeeBps)}
				</span>
				<ArrowRight className="size-3.5" aria-hidden="true" />
				<span className="font-bold" data-testid="fee-impact-queued-rate">
					{bpsToPercent(pending.queuedFeeBps)}
				</span>
			</div>
			<p className="mt-2" data-testid="fee-impact-fees">
				Fee on this order would be {formatDisplayKeyPrice(queuedFeeStroops)}{' '}
				instead of {formatDisplayKeyPrice(currentFeeStroops)}.
			</p>
			{deltaStroops !== 0 && (
				<p className="mt-1" data-testid="fee-impact-delta">
					{deltaStroops > 0 ? '+' : '−'}
					{formatDisplayKeyPrice(Math.abs(deltaStroops))} after execution.
				</p>
			)}
		</div>
	);
}
