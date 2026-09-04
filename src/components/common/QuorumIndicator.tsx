import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle, AlertCircle } from 'lucide-react';
import type { QuorumIndicatorProps } from '@/types/governance';

/**
 * Governance quorum indicator (#826).
 *
 * Renders a progress bar filled to the current participation percentage,
 * a marker at the quorum threshold, and a green / amber status label.
 *
 * Acceptance criteria:
 *  - Participation percentage computed and bar filled correctly
 *  - Quorum threshold marker shown at the correct position
 *  - 'Quorum reached' shown in green when participation meets the threshold
 *  - 'Quorum not yet reached' shown in amber when below threshold
 *  - Bar updates after each vote (caller passes refreshed data)
 */
const QuorumIndicator: React.FC<QuorumIndicatorProps> = ({
	quorumBps,
	totalVotingWeight,
	totalCirculatingSupply,
	className,
}) => {
	const { participationPct, quorumPct, quorumReached } = useMemo(() => {
		if (!totalCirculatingSupply || totalCirculatingSupply <= 0) {
			return { participationPct: 0, quorumPct: 0, quorumReached: false };
		}

		const participation = (totalVotingWeight / totalCirculatingSupply) * 100;
		const quorum = quorumBps / 100; // basis points → percentage

		return {
			participationPct: Math.min(participation, 100),
			quorumPct: Math.min(quorum, 100),
			quorumReached: participation >= quorum,
		};
	}, [quorumBps, totalVotingWeight, totalCirculatingSupply]);

	return (
		<div
			className={cn('space-y-1.5', className)}
			role="status"
			aria-label={
				quorumReached
					? `Quorum reached: ${participationPct.toFixed(1)}% participation`
					: `Quorum not yet reached: ${participationPct.toFixed(1)}% participation, ${quorumPct}% required`
			}
		>
			{/* Progress bar track */}
			<div className="relative h-2 w-full overflow-hidden rounded-full bg-white/[0.08]">
				{/* Filled portion — participation */}
				<div
					className={cn(
						'absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out',
						quorumReached
							? 'bg-emerald-500'
							: 'bg-amber-400'
					)}
					style={{ width: `${participationPct}%` }}
					aria-hidden="true"
				/>

				{/* Quorum threshold marker */}
				<div
					className="absolute inset-y-0 w-0.5 bg-white/70"
					style={{ left: `${quorumPct}%` }}
					aria-hidden="true"
				/>
			</div>

			{/* Labels row */}
			<div className="flex items-center justify-between text-xs">
				<div className="flex items-center gap-1">
					{quorumReached ? (
						<CheckCircle className="size-3.5 text-emerald-400" aria-hidden="true" />
					) : (
						<AlertCircle className="size-3.5 text-amber-400" aria-hidden="true" />
					)}
					<span
						className={cn(
							'font-semibold',
							quorumReached ? 'text-emerald-400' : 'text-amber-400'
						)}
					>
						{quorumReached ? 'Quorum reached' : 'Quorum not yet reached'}
					</span>
				</div>
				<span className="tabular-nums text-white/50">
					{participationPct.toFixed(1)}% / {quorumPct.toFixed(0)}%
				</span>
			</div>
		</div>
	);
};

export default QuorumIndicator;
