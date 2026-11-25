import type { FC } from 'react';
import { Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LaunchPhase } from '@/utils/launchCommitReveal.utils';

interface PhaseCountdownProps {
	phase: LaunchPhase;
	ledgersRemaining: number | null;
	countdownLabel: string | null;
	className?: string;
}

const phaseLabels: Record<LaunchPhase, string> = {
	inactive: 'Not started',
	commit: 'Commit phase',
	reveal: 'Reveal phase',
	settled: 'Settled',
};

const PhaseCountdown: FC<PhaseCountdownProps> = ({
	phase,
	ledgersRemaining,
	countdownLabel,
	className,
}) => {
	if (phase === 'inactive') return null;

	return (
		<p
			role="status"
			aria-live="polite"
			data-testid="launch-phase-countdown"
			className={cn(
				'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold',
				phase === 'settled'
					? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
					: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
				className
			)}
		>
			<Timer className="size-3.5 shrink-0" aria-hidden="true" />
			<span>{phaseLabels[phase]}</span>
			{phase !== 'settled' &&
				ledgersRemaining != null &&
				countdownLabel != null && (
					<span className="font-mono tabular-nums">
						{ledgersRemaining} ledgers · {countdownLabel}
					</span>
				)}
		</p>
	);
};

export default PhaseCountdown;
