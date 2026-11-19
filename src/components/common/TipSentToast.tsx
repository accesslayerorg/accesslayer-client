import React from 'react';
import toast from 'react-hot-toast';
import { Sparkles, X, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatXlmPrice } from '@/utils/numberFormat.utils';
import type { TipSentToastData } from '@/types/tip.types';

export interface TipSentToastProps {
	toastId: string;
	data: TipSentToastData;
}

/**
 * Toast notification rendered when a tip to a creator is confirmed on-chain.
 */
export const TipSentToast: React.FC<TipSentToastProps> = ({
	toastId,
	data,
}) => {
	const fee = data.fee ?? Number(((data.amount * 0.02)).toFixed(4));

	return (
		<div
			role="status"
			aria-live="polite"
			data-testid="tip-sent-toast"
			className={cn(
				'pointer-events-auto flex w-full max-w-md flex-col gap-3 rounded-2xl',
				'border border-amber-500/30 bg-[#071322] p-4 text-white shadow-2xl shadow-amber-500/10'
			)}
		>
			{/* Header */}
			<div className="flex items-center justify-between border-b border-white/10 pb-2.5">
				<div className="flex items-center gap-2.5">
					<div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500/30 to-amber-300/20 text-amber-300">
						<Heart className="size-4 fill-amber-300 text-amber-300" aria-hidden="true" />
					</div>
					<div>
						<h4 className="font-jakarta text-sm font-bold text-white flex items-center gap-1.5">
							Tip Sent!
							<Sparkles className="size-3.5 text-amber-400" />
						</h4>
						<p className="text-xs text-white/60">
							Successfully sent to <span className="font-semibold text-white/90">{data.creatorName}</span>
						</p>
					</div>
				</div>

				<button
					type="button"
					onClick={() => toast.dismiss(toastId)}
					aria-label="Dismiss notification"
					className="flex size-6 items-center justify-center rounded-md text-white/40 hover:bg-white/10 hover:text-white transition-colors"
				>
					<X className="size-3.5" aria-hidden="true" />
				</button>
			</div>

			{/* Tip Summary Breakdown */}
			<div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs space-y-1.5">
				<div className="flex items-center justify-between">
					<span className="text-white/60">Total Sent:</span>
					<span className="font-bold text-white tabular-nums">
						{formatXlmPrice(data.amount)}
					</span>
				</div>
				<div className="flex items-center justify-between text-white/50">
					<span>2% Fee:</span>
					<span className="tabular-nums">
						-{formatXlmPrice(fee)}
					</span>
				</div>
				<div className="flex items-center justify-between border-t border-white/10 pt-1.5 font-semibold text-emerald-400">
					<span>Net to Creator:</span>
					<span className="tabular-nums font-bold">
						{formatXlmPrice(data.netAmount)}
					</span>
				</div>
			</div>

			{/* Message Preview */}
			{data.message && (
				<p className="rounded-lg bg-white/[0.02] border border-white/5 p-2 text-xs italic text-white/70">
					&ldquo;{data.message}&rdquo;
				</p>
			)}
		</div>
	);
};

export default TipSentToast;
