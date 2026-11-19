import { CheckCircle2 } from 'lucide-react';

interface SpotlightBidPlacedToastProps {
	amount: number;
	slotLabel: string;
}

/** Confirmation toast shown once a spotlight bid is confirmed (#1147). */
export default function SpotlightBidPlacedToast({
	amount,
	slotLabel,
}: SpotlightBidPlacedToastProps) {
	return (
		<div
			role="status"
			data-testid="spotlight-bid-placed-toast"
			className="flex items-start gap-3 rounded-xl border border-emerald-400/30 bg-[#06111f] px-4 py-3 text-sm text-white shadow-lg"
		>
			<CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" aria-hidden="true" />
			<div>
				<p className="font-bold">SpotlightBidPlaced</p>
				<p className="text-xs text-white/60">
					Bid of {amount.toFixed(2)} XLM placed on {slotLabel}.
				</p>
			</div>
		</div>
	);
}
