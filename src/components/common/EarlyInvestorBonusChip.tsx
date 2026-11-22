import React from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EarlyIncentive } from '@/services/earlyIncentive.service';

export interface EarlyInvestorBonusChipProps {
	incentive?: EarlyIncentive | null;
	isLoading?: boolean;
	className?: string;
}

/**
 * Early investor bonus chip (#1232).
 *
 * Surfaces the remaining early funding incentive slots on the invest panel
 * to drive urgency. Renders the greyed "Early spots filled" state once every
 * slot is taken, and nothing at all when the key has no incentive configured.
 */
export const EarlyInvestorBonusChip: React.FC<EarlyInvestorBonusChipProps> = ({
	incentive,
	isLoading = false,
	className,
}) => {
	if (isLoading) return null;
	if (!incentive || !incentive.configured) return null;

	const filled = incentive.slotsRemaining <= 0;

	return (
		<span
			className={cn(
				'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold',
				filled
					? 'border-white/10 bg-white/[0.04] text-white/45'
					: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
				className
			)}
			data-testid="early-investor-bonus-chip"
			data-slots-remaining={incentive.slotsRemaining}
			data-bonus-bps={incentive.bonusBps}
			title={
				filled
					? 'Early investor bonus slots are fully taken'
					: `Early investor bonus: +${incentive.bonusBps} bps`
			}
		>
			<Sparkles
				className={cn('size-3.5 shrink-0', filled ? 'text-white/35' : 'text-amber-400')}
				aria-hidden="true"
			/>
			{filled ? (
				<span data-testid="early-investor-bonus-filled">Early spots filled</span>
			) : (
				<>
					<span data-testid="early-investor-bonus-bps">
						+{incentive.bonusBps} bps bonus
					</span>
					<span aria-hidden="true" className="text-white/25">
						·
					</span>
					<span
						className="font-mono tabular-nums"
						data-testid="early-investor-bonus-slots"
					>
						{incentive.slotsRemaining}{' '}
						{incentive.slotsRemaining === 1 ? 'slot' : 'slots'} left
					</span>
					<span aria-hidden="true" className="text-white/25">
						·
					</span>
					<span className="uppercase tracking-wider">Limited spots</span>
				</>
			)}
		</span>
	);
};

export default EarlyInvestorBonusChip;
