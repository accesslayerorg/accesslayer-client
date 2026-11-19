import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';
import { useKeyReputation } from '@/hooks/useKeyReputation';
import {
	REPUTATION_METHODOLOGY_TOOLTIP,
	REPUTATION_SCORE_MAX,
	formatReputationScore,
	reputationTier,
} from '@/utils/keyReputation.utils';
import { cn } from '@/lib/utils';

export interface ReputationScoreBadgeProps {
	keyId: string;
	className?: string;
}

const TIER_CLASSNAMES: Record<string, string> = {
	excellent: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
	good: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
	fair: 'border-orange-400/30 bg-orange-400/10 text-orange-300',
	poor: 'border-rose-400/30 bg-rose-400/10 text-rose-300',
};

/**
 * Reputation score badge shown on the discovery feed's key cards (#1143).
 * Displays the composite score out of 1000 with a tooltip explaining the
 * methodology. Renders nothing while loading or when no score is available,
 * so it never disrupts card layout for keys without a computed score yet.
 */
export const ReputationScoreBadge: React.FC<ReputationScoreBadgeProps> = ({
	keyId,
	className,
}) => {
	const { data, isLoading, isError } = useKeyReputation(keyId);

	if (isLoading || isError || !data) return null;

	const tier = reputationTier(data.score);

	return (
		<Tooltip content={REPUTATION_METHODOLOGY_TOOLTIP}>
			<span
				data-testid="reputation-score-badge"
				aria-label={`Reputation score ${formatReputationScore(data.score)} out of ${REPUTATION_SCORE_MAX}`}
				className={cn(
					'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[0.68rem] font-bold',
					TIER_CLASSNAMES[tier],
					className
				)}
			>
				<ShieldCheck className="size-3" aria-hidden="true" />
				{formatReputationScore(data.score)}
			</span>
		</Tooltip>
	);
};

export default ReputationScoreBadge;
