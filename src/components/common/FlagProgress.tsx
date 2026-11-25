import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Flag, Lock } from 'lucide-react';
import Skeleton from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { KeyFlagResolution } from '@/services/course.service';
import { formatAbsoluteDateTime } from '@/utils/time.utils';

export interface FlagProgressProps {
	/** Flags recorded against the key so far. */
	flagCount: number;
	/** Number of flags that auto-freezes trading. */
	threshold: number;
	/** Whether the key is currently frozen for review. */
	autoFrozen?: boolean;
	/** Resolution of the current wallet's flag, when completed (#1386). */
	resolution?: KeyFlagResolution | null;
	isLoading?: boolean;
	/** Optional action rendered beside the heading (e.g. the flag button). */
	action?: ReactNode;
	className?: string;
}

/**
 * Flag progress against the auto-freeze threshold on the key detail page
 * (#1386). Trading freezes automatically once the count reaches the threshold;
 * a completed review shows whether the flagger's stake was returned or
 * forfeited.
 */
export default function FlagProgress({
	flagCount,
	threshold,
	autoFrozen = false,
	resolution,
	isLoading = false,
	action,
	className,
}: FlagProgressProps) {
	const safeThreshold = Math.max(0, threshold);
	const safeCount = Math.max(0, flagCount);
	const remaining = Math.max(0, safeThreshold - safeCount);
	const isFrozen = autoFrozen || (safeThreshold > 0 && safeCount >= safeThreshold);
	const percent =
		safeThreshold > 0
			? Math.min(100, Math.round((safeCount / safeThreshold) * 100))
			: 0;

	if (isLoading) {
		return (
			<section
				aria-labelledby="flag-progress-heading"
				aria-busy="true"
				className={cn(
					'rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8',
					className
				)}
				data-testid="flag-progress-loading"
			>
				<div className="mb-6 flex items-center justify-between">
					<Skeleton className="h-6 w-40" />
					<Skeleton className="h-8 w-28 rounded-xl" />
				</div>
				<Skeleton className="h-2.5 w-full rounded-full" />
				<span role="status" className="sr-only">
					Loading key flag status
				</span>
			</section>
		);
	}

	return (
		<section
			aria-labelledby="flag-progress-heading"
			className={cn(
				'rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8',
				className
			)}
			data-testid="flag-progress"
		>
			<div className="mb-6 flex flex-wrap items-center justify-between gap-4">
				<div className="flex items-center gap-2">
					<Flag className="size-5 text-amber-400" aria-hidden="true" />
					<h2
						id="flag-progress-heading"
						className="font-grotesque text-xl font-black tracking-tight text-white"
					>
						Community Flags
					</h2>
					{isFrozen && (
						<span
							className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-wider text-rose-300"
							data-testid="flag-progress-frozen-badge"
						>
							<Lock className="size-3" aria-hidden="true" />
							Trading frozen
						</span>
					)}
				</div>
				{action}
			</div>

			<div className="flex items-center justify-between text-sm">
				<span className="text-white/60">Flags against threshold</span>
				<span
					className="font-bold tabular-nums text-white"
					data-testid="flag-progress-count"
				>
					{safeCount} of {safeThreshold}
				</span>
			</div>

			<div
				role="progressbar"
				aria-label="Flags toward auto-freeze threshold"
				aria-valuemin={0}
				aria-valuemax={safeThreshold}
				aria-valuenow={Math.min(safeCount, safeThreshold)}
				aria-valuetext={`${safeCount} of ${safeThreshold} flags`}
				className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white/10"
				data-testid="flag-progress-bar"
			>
				<div
					className={cn(
						'h-full rounded-full transition-all',
						isFrozen ? 'bg-rose-500' : 'bg-amber-400'
					)}
					style={{ width: `${percent}%` }}
				/>
			</div>

			<p className="mt-3 text-xs text-white/55 font-jakarta">
				{isFrozen
					? 'The threshold has been reached. Trading is frozen while the flags are reviewed.'
					: remaining === 1
					? '1 more flag freezes trading until review.'
					: `${remaining} more flags freeze trading until review.`}
			</p>

			{resolution && (
				<div
					className={cn(
						'mt-4 flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-semibold',
						resolution.status === 'returned'
							? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
							: 'border-rose-500/20 bg-rose-500/10 text-rose-300'
					)}
					data-testid="flag-resolution-status"
				>
					{resolution.status === 'returned' ? (
						<>
							<CheckCircle2 className="size-4" aria-hidden="true" />
							<span>Your stake was returned</span>
						</>
					) : (
						<>
							<AlertTriangle className="size-4" aria-hidden="true" />
							<span>Your stake was forfeited</span>
						</>
					)}
					<span className="text-white/50 font-normal">
						{formatAbsoluteDateTime(resolution.resolvedAt) ??
							resolution.resolvedAt}
					</span>
				</div>
			)}

			{resolution?.note && (
				<p className="mt-2 text-xs text-white/50 font-jakarta">
					{resolution.note}
				</p>
			)}
		</section>
	);
}
