import * as React from 'react';
import { cn } from '@/lib/utils';
import { formatDisplayKeyPrice } from '@/utils/keyPriceDisplay.utils';

export interface CeilingIndicatorProps {
	currentPriceStroops?: number | null;
	ceilingStroops?: number | null;
	isActive?: boolean;
	isLoading?: boolean;
	className?: string;
}

const CeilingIndicator: React.FC<CeilingIndicatorProps> = ({
	currentPriceStroops,
	ceilingStroops,
	isActive = true,
	isLoading = false,
	className,
}) => {
	if (ceilingStroops == null || ceilingStroops <= 0) return null;

	if (isLoading) {
		return (
			<div
				data-testid="ceiling-indicator-loading"
				className={cn(
					'rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2.5',
					className
				)}
			>
				<div className="h-3 w-28 animate-pulse rounded bg-white/10" />
				<div className="mt-2 h-2 w-full animate-pulse rounded-full bg-white/10" />
			</div>
		);
	}

	const current = Math.max(0, currentPriceStroops ?? 0);
	const ratio = Math.min(1, current / ceilingStroops);
	const percent = Math.round(ratio * 100);

	return (
		<div
			data-testid="ceiling-indicator"
			className={cn(
				'rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2.5',
				className
			)}
		>
			<div className="flex items-center justify-between gap-3">
				<p className="text-xs font-semibold uppercase tracking-wider text-amber-200/80">
					Price ceiling
					{!isActive && ' (inactive)'}
				</p>
				<span
					data-testid="ceiling-indicator-percent"
					className="text-xs font-semibold tabular-nums text-amber-100"
				>
					{percent}%
				</span>
			</div>

			<div
				role="progressbar"
				aria-label="Current price relative to price ceiling"
				aria-valuemin={0}
				aria-valuemax={ceilingStroops}
				aria-valuenow={Math.min(current, ceilingStroops)}
				className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10"
			>
				<div
					data-testid="ceiling-indicator-fill"
					className="h-full rounded-full bg-amber-400 transition-[width] duration-300"
					style={{ width: `${percent}%` }}
				/>
			</div>

			<div className="mt-2 flex items-center justify-between gap-3 text-[0.7rem] text-white/60">
				<span data-testid="ceiling-indicator-current">
					Current: {formatDisplayKeyPrice(currentPriceStroops)}
				</span>
				<span data-testid="ceiling-indicator-ceiling">
					Ceiling: {formatDisplayKeyPrice(ceilingStroops)}
				</span>
			</div>
		</div>
	);
};

export default CeilingIndicator;
