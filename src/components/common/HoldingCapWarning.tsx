/**
 * HoldingCapWarning (#961)
 *
 * Displays the connected wallet's current key holding as a percentage of the
 * contract-defined maximum cap for a given creator. Shows:
 *
 *  - A progress bar (current / max).
 *  - A warning banner when holding ≥ 80% of cap.
 *  - A "cap reached" state that surfaces via `isAtCap` for callers to
 *    disable the buy button.
 *
 * This component is purely presentational — it receives pre-fetched data
 * from the parent (which calls `useHoldingCapStore.fetchCap`).
 */

import { AlertTriangle, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
	type HoldingCapData,
	capUsedFraction,
	isApproachingCap,
	isAtHoldingCap,
	remainingCapacity,
} from '@/hooks/useHoldingCapStore';

export interface HoldingCapWarningProps {
	data: HoldingCapData;
	className?: string;
}

const HoldingCapWarning: React.FC<HoldingCapWarningProps> = ({
	data,
	className,
}) => {
	const fraction = capUsedFraction(data);
	const pct = Math.round(fraction * 100);
	const atCap = isAtHoldingCap(data);
	const approaching = isApproachingCap(data);
	const remaining = remainingCapacity(data);

	// Show nothing while loading or when there's no cap data.
	if (data.isLoading || data.maxCap === 0) return null;

	return (
		<div className={cn('space-y-2', className)}>
			{/* Progress bar row */}
			<div className="space-y-1">
				<div className="flex items-center justify-between text-xs text-white/50">
					<span>
						Holding:{' '}
						<span className="font-semibold text-white/70">
							{data.currentHolding}
						</span>{' '}
						/ {data.maxCap} keys
					</span>
					<span
						className={cn(
							'font-semibold tabular-nums',
							atCap
								? 'text-red-400'
								: approaching
									? 'text-amber-400'
									: 'text-white/50'
						)}
						aria-label={`${pct}% of maximum holding cap used`}
					>
						{pct}%
					</span>
				</div>

				{/* Track + fill */}
				<div
					role="progressbar"
					aria-valuenow={pct}
					aria-valuemin={0}
					aria-valuemax={100}
					aria-label={`Key holding: ${pct}% of maximum cap`}
					className="h-1.5 w-full overflow-hidden rounded-full bg-white/10"
				>
					<div
						className={cn(
							'h-full rounded-full transition-all duration-500',
							atCap
								? 'bg-red-500'
								: approaching
									? 'bg-amber-400'
									: 'bg-emerald-500/70'
						)}
						style={{ width: `${pct}%` }}
					/>
				</div>
			</div>

			{/* Warning banner — approaching cap */}
			{approaching && !atCap && (
				<div
					role="status"
					aria-live="polite"
					className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2"
				>
					<AlertTriangle
						className="mt-0.5 size-3.5 shrink-0 text-amber-400"
						aria-hidden="true"
					/>
					<p className="text-xs leading-relaxed text-amber-200/80">
						You hold {pct}% of the maximum cap. You can buy up to{' '}
						<span className="font-semibold text-amber-300">
							{remaining} more key{remaining !== 1 ? 's' : ''}
						</span>
						.
					</p>
				</div>
			)}

			{/* Cap-reached state */}
			{atCap && (
				<div
					role="alert"
					className="flex items-start gap-2 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2"
				>
					<Lock
						className="mt-0.5 size-3.5 shrink-0 text-red-400"
						aria-hidden="true"
					/>
					<p className="text-xs leading-relaxed text-red-200/80">
						Maximum holding cap reached ({data.maxCap} keys). You cannot
						purchase more keys for this creator from this wallet.
					</p>
				</div>
			)}
		</div>
	);
};

export default HoldingCapWarning;
