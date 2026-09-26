import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
	formatCountdownDuration,
	getRemainingMs,
} from '@/utils/mergeProposal.utils';

export interface MergeProposalCountdownProps {
	votingDeadline: string;
	onExpire?: () => void;
	className?: string;
}

/**
 * Ticking countdown to a merge proposal's voting deadline (#983). Updates
 * every second from the actual deadline timestamp so it stays accurate
 * regardless of how long the page has been open.
 */
export default function MergeProposalCountdown({
	votingDeadline,
	onExpire,
	className,
}: MergeProposalCountdownProps) {
	const [remainingMs, setRemainingMs] = useState(() =>
		getRemainingMs(votingDeadline)
	);

	useEffect(() => {
		const initial = getRemainingMs(votingDeadline);
		setRemainingMs(initial);

		if (initial <= 0) {
			onExpire?.();
			return;
		}

		const intervalId = setInterval(() => {
			const remaining = getRemainingMs(votingDeadline);
			setRemainingMs(remaining);
			if (remaining <= 0) {
				clearInterval(intervalId);
				onExpire?.();
			}
		}, 1000);

		return () => clearInterval(intervalId);
	}, [votingDeadline, onExpire]);

	if (remainingMs <= 0) return null;

	const formatted = formatCountdownDuration(remainingMs);

	return (
		<div
			className={cn(
				'inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.05] px-2.5 py-1 text-xs font-semibold text-white/80',
				className
			)}
			data-testid="merge-proposal-countdown"
			role="status"
			aria-live="polite"
			aria-label={`Voting closes in ${formatted}`}
		>
			<Clock className="size-3.5 shrink-0 text-amber-300" aria-hidden="true" />
			<span data-testid="merge-proposal-countdown-text">
				Voting closes in{' '}
				<span className="font-mono tabular-nums">{formatted}</span>
			</span>
		</div>
	);
}
