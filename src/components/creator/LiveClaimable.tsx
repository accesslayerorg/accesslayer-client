import React, { useEffect, useState } from 'react';
import { PauseCircle, TrendingUp } from 'lucide-react';
import type { EarningsStream } from '@/types/stream';
import { calculateClaimableBalance } from '@/utils/stream.utils';
import { cn } from '@/lib/utils';

export interface LiveClaimableProps {
	stream: EarningsStream;
	className?: string;
}

export const LiveClaimable: React.FC<LiveClaimableProps> = ({
	stream,
	className,
}) => {
	const [currentTime, setCurrentTime] = useState<number>(Date.now());

	useEffect(() => {
		// When stream is paused, accrual stops and value is frozen (#acceptance criteria)
		if (stream.isPaused) return;

		const interval = setInterval(() => {
			setCurrentTime(Date.now());
		}, 1000);

		return () => clearInterval(interval);
	}, [stream.isPaused]);

	const claimable = calculateClaimableBalance(stream, currentTime);

	return (
		<div
			className={cn(
				'rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-1',
				className
			)}
			data-testid="live-claimable-container"
		>
			<div className="flex items-center justify-between text-xs text-white/60">
				<span className="flex items-center gap-1 font-medium">
					{stream.isPaused ? (
						<PauseCircle className="size-3.5 text-amber-400" />
					) : (
						<TrendingUp className="size-3.5 text-emerald-400" />
					)}
					Accrued Claimable Balance
				</span>
				{stream.isPaused && (
					<span
						className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-semibold text-amber-300 border border-amber-500/30"
						data-testid="claimable-frozen-badge"
					>
						Frozen (Paused)
					</span>
				)}
			</div>

			<div className="flex items-baseline gap-2">
				<span
					className="font-mono text-2xl sm:text-3xl font-extrabold text-emerald-400 tabular-nums"
					data-testid="live-claimable-value"
				>
					{claimable.toLocaleString(undefined, {
						minimumFractionDigits: 4,
						maximumFractionDigits: 6,
					})}
				</span>
				<span className="font-mono text-sm text-white/50">XLM</span>
			</div>

			<p className="text-[11px] text-white/40">
				Max capacity: {(stream.fundedAmount - stream.withdrawnAmount).toLocaleString()} XLM
			</p>
		</div>
	);
};

export default LiveClaimable;
