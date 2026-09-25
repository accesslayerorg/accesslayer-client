import React from 'react';
import { AlertTriangle, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/utils/numberFormat.utils';
import type { HoldingCapState } from '@/utils/holdingCap.utils';

export interface HoldingCapWarningProps {
	/** Wallet's position relative to the key's holding cap. */
	capState: HoldingCapState;
	className?: string;
}

/**
 * Holding-cap progress and warning for the buy panel (#961).
 *
 * Shows the wallet's cap usage as a progress bar and warns when the
 * wallet is approaching (>= 80%) or has reached (100%) the maximum
 * number of keys it may hold. Hidden entirely for keys without a cap.
 */
export const HoldingCapWarning: React.FC<HoldingCapWarningProps> = ({
	capState,
	className,
}) => {
	if (capState.status === 'no-cap') {
		return null;
	}

	const percentUsed = Math.round(capState.percentUsed ?? 0);
	const reached = capState.status === 'reached';
	const warning = capState.status === 'warning';

	return (
		<div
			role="alert"
			data-testid="holding-cap-warning"
			className={cn('space-y-2', className)}
		>
			<div
				data-testid="holding-cap-progress"
				className={cn(
					'flex items-start gap-2.5 rounded-xl border p-3 text-xs transition-colors',
					reached
						? 'border-red-500/40 bg-red-500/10 text-red-200'
						: warning
							? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
							: 'border-white/10 bg-white/[0.03] text-white/70'
				)}
			>
				{reached ? (
					<Lock className="h-4 w-4 shrink-0 mt-0.5 text-red-400" aria-hidden="true" />
				) : warning ? (
					<AlertTriangle
						className="h-4 w-4 shrink-0 mt-0.5 text-amber-400"
						aria-hidden="true"
					/>
				) : (
					<span className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
				)}
				<div className="min-w-0 flex-1">
					<p className="font-medium leading-snug">
						{reached
							? `Maximum holding cap reached — you hold ${formatNumber(capState.holding)} of ${formatNumber(capState.maxCap ?? 0)} keys. Buying is disabled.`
							: `You hold ${formatNumber(capState.holding)} of ${formatNumber(capState.maxCap ?? 0)} keys (${percentUsed}% of the holding cap).`}
					</p>
					<div
						role="progressbar"
						aria-valuenow={percentUsed}
						aria-valuemin={0}
						aria-valuemax={100}
						aria-label="Holding cap used"
						className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10"
					>
						<div
							className={cn(
								'h-full rounded-full transition-all',
								reached
									? 'bg-red-400'
									: warning
										? 'bg-amber-400'
										: 'bg-emerald-400'
							)}
							style={{ width: `${percentUsed}%` }}
						/>
					</div>
				</div>
			</div>
			{warning && (
				<p className="px-1 text-[11px] text-amber-300/90">
					You are approaching the maximum holding cap for this key.
					Purchases are limited to your remaining capacity of{' '}
					{formatNumber(capState.remaining ?? 0)} key
					{(capState.remaining ?? 0) === 1 ? '' : 's'}.
				</p>
			)}
		</div>
	);
};

export default HoldingCapWarning;
