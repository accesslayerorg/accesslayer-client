import React from 'react';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ConvictionProjection } from '@/types/conviction';
import { calculateConvictionProjection } from '@/utils/conviction.utils';

export interface ConvictionMeterProps {
	/** Current accumulated conviction. */
	conviction: number;
	/** Conviction threshold required to pass. */
	threshold: number;
	/** Total stake allocated by all users. */
	totalStake?: number;
	/** Alpha decay parameter (optional). */
	alpha?: number;
	/** Precomputed projection (optional). */
	projection?: ConvictionProjection;
	/** Optional class name. */
	className?: string;
}

export const ConvictionMeter: React.FC<ConvictionMeterProps> = ({
	conviction,
	threshold,
	totalStake = 0,
	alpha = 0.9,
	projection: customProjection,
	className,
}) => {
	const validThreshold = Math.max(1, threshold);
	const validConviction = Math.max(0, conviction);
	const percentage = Math.min(100, (validConviction / validThreshold) * 100);

	const projection =
		customProjection ??
		calculateConvictionProjection(validConviction, validThreshold, totalStake, alpha);

	const isCrossed = validConviction >= validThreshold;

	return (
		<div
			className={cn('space-y-2 rounded-xl bg-white/[0.03] p-4 border border-white/10', className)}
			data-testid="conviction-meter"
		>
			<div className="flex items-center justify-between text-sm">
				<span className="font-medium text-white/70">Conviction Progress</span>
				<div className="flex items-center gap-2">
					<span
						className="font-mono font-semibold text-white tabular-nums"
						data-testid="conviction-values"
					>
						{Math.round(validConviction).toLocaleString()} /{' '}
						{Math.round(validThreshold).toLocaleString()}
					</span>
					<span
						className={cn(
							'rounded-full px-2 py-0.5 text-xs font-semibold',
							isCrossed
								? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
								: 'bg-white/10 text-white/60'
						)}
						data-testid="conviction-percentage"
					>
						{percentage.toFixed(1)}%
					</span>
				</div>
			</div>

			{/* Progress track */}
			<div
				className="relative h-3 w-full overflow-hidden rounded-full bg-white/10"
				role="progressbar"
				aria-valuenow={Math.round(validConviction)}
				aria-valuemin={0}
				aria-valuemax={Math.round(validThreshold)}
				aria-label="Conviction progress relative to threshold"
			>
				<div
					data-testid="conviction-progress-bar"
					className={cn(
						'h-full transition-all duration-300 rounded-full',
						isCrossed
							? 'bg-gradient-to-r from-emerald-500 to-teal-400'
							: 'bg-gradient-to-r from-cyan-500 to-blue-500'
					)}
					style={{ width: `${percentage}%` }}
				/>
			</div>

			{/* Projection & status note */}
			<div className="flex items-center justify-between text-xs text-white/60 pt-1">
				<div
					className="flex items-center gap-1.5"
					data-testid="conviction-projection"
				>
					{isCrossed ? (
						<>
							<CheckCircle2 className="size-3.5 text-emerald-400" />
							<span className="text-emerald-400 font-medium">
								{projection.displayText}
							</span>
						</>
					) : projection.isReachable ? (
						<>
							<Clock className="size-3.5 text-cyan-400" />
							<span className="text-white/70">
								{projection.displayText}
							</span>
						</>
					) : (
						<>
							<AlertCircle className="size-3.5 text-amber-400" />
							<span className="text-amber-400/90">
								{projection.displayText}
							</span>
						</>
					)}
				</div>
				<span className="text-[11px] text-white/40">
					Threshold: {Math.round(validThreshold).toLocaleString()}
				</span>
			</div>
		</div>
	);
};

export default ConvictionMeter;
