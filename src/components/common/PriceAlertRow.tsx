import { Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/utils/time.utils';
import { STROOPS_PER_XLM } from '@/constants/stellar';
import type { PriceAlert } from '@/types/priceAlert.types';

interface PriceAlertRowProps {
	alert: PriceAlert;
	onDelete: (id: string) => void;
}

export default function PriceAlertRow({ alert, onDelete }: PriceAlertRowProps) {
	const thresholdXlm = (alert.thresholdStroops / STROOPS_PER_XLM).toFixed(4);
	const isAbove = alert.direction === 'above';

	return (
		<li className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
			<div className="flex min-w-0 flex-col gap-0.5">
				<span className="truncate text-sm font-medium text-foreground">
					{alert.creatorTitle}
				</span>
				<div className="flex items-center gap-2">
					<span
						className={cn(
							'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium',
							isAbove
								? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
								: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
						)}
					>
						{isAbove ? (
							<TrendingUp className="size-3" aria-hidden="true" />
						) : (
							<TrendingDown className="size-3" aria-hidden="true" />
						)}
						{isAbove ? 'Above' : 'Below'} {thresholdXlm} XLM
					</span>
				</div>
				<span className="text-xs text-muted-foreground">
					Last triggered:{' '}
					{alert.lastTriggeredAt
						? formatRelativeTime(alert.lastTriggeredAt)
						: 'Never'}
				</span>
			</div>

			<button
				type="button"
				onClick={() => onDelete(alert.id)}
				aria-label={`Delete alert for ${alert.creatorTitle}`}
				className={cn(
					'shrink-0 rounded-lg p-2 text-muted-foreground',
					'hover:bg-destructive/10 hover:text-destructive',
					'focus:outline-none focus:ring-2 focus:ring-destructive/50'
				)}
			>
				<Trash2 className="size-4" aria-hidden="true" />
			</button>
		</li>
	);
}
