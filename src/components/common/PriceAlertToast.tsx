import toast from 'react-hot-toast';
import { TrendingUp, TrendingDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STROOPS_PER_XLM } from '@/constants/stellar';
import type { PriceAlert } from '@/types/priceAlert.types';

function formatXlmFromStroops(stroops: number): string {
	return (stroops / STROOPS_PER_XLM).toFixed(4);
}

interface PriceAlertToastProps {
	t: { id: string; visible: boolean };
	alert: PriceAlert;
	triggeredPriceStroops: number;
}

export default function PriceAlertToast({
	t,
	alert,
	triggeredPriceStroops,
}: PriceAlertToastProps) {
	const isAbove = alert.direction === 'above';
	const Icon = isAbove ? TrendingUp : TrendingDown;
	const directionLabel = isAbove ? 'above' : 'below';
	const colorClass = isAbove ? 'text-emerald-400' : 'text-rose-400';
	const borderClass = isAbove ? 'border-emerald-500/20' : 'border-rose-500/20';
	const iconBgClass = isAbove ? 'bg-emerald-500/10' : 'bg-rose-500/10';

	return (
		<div
			role="alert"
			aria-live="assertive"
			className={cn(
				'pointer-events-auto relative flex w-full max-w-sm rounded-xl border bg-slate-900 shadow-xl',
				borderClass,
				t.visible ? 'animate-enter' : 'animate-leave'
			)}
		>
			<div className="flex w-full items-start gap-3 p-4">
				<div
					className={cn(
						'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
						iconBgClass
					)}
				>
					<Icon className={cn('h-4 w-4', colorClass)} aria-hidden="true" />
				</div>

				<div className="min-w-0 flex-1">
					<p className="text-sm font-bold leading-tight text-white">
						Price alert triggered
					</p>
					<p className="mt-1 truncate text-xs text-white/70">
						{alert.creatorTitle}
					</p>
					<p className="mt-1 text-xs text-white/50">
						Price is now{' '}
						<span className={cn('font-semibold', colorClass)}>
							{formatXlmFromStroops(triggeredPriceStroops)} XLM
						</span>{' '}
						— {directionLabel} your threshold of{' '}
						<span className="font-semibold text-white/70">
							{formatXlmFromStroops(alert.thresholdStroops)} XLM
						</span>
					</p>
				</div>

				<button
					type="button"
					aria-label="Dismiss notification"
					onClick={() => toast.dismiss(t.id)}
					className="ml-1 shrink-0 rounded-md p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white/80"
				>
					<X className="h-3.5 w-3.5" aria-hidden="true" />
				</button>
			</div>

			<div className="absolute bottom-0 left-0 h-0.5 w-full overflow-hidden rounded-b-xl">
				<div
					className={cn(
						'h-full',
						isAbove ? 'bg-emerald-500/40' : 'bg-rose-500/40'
					)}
				/>
			</div>
		</div>
	);
}
