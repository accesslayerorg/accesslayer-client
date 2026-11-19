/**
 * Wallet volume discount tier badge for the trade confirmation screen and
 * wallet profile page (#1102).
 */
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
	computeTierProgress,
	type VolumeDiscountTier,
} from '@/utils/volumeDiscountTier.utils';
import { formatDisplayKeyPrice } from '@/utils/keyPriceDisplay.utils';

export interface VolumeTierBadgeProps {
	/** The wallet's current tier, or null when it has no discount tier yet. */
	tier: VolumeDiscountTier | null;
	/** The wallet's cumulative trading volume in stroops, for the progress tooltip. */
	cumulativeVolumeStroops: number;
	className?: string;
}

const TIER_LABEL: Record<VolumeDiscountTier, string> = {
	bronze: 'Bronze',
	silver: 'Silver',
	gold: 'Gold',
};

const TIER_BADGE_CLASS: Record<VolumeDiscountTier, string> = {
	bronze: 'text-amber-700 border-amber-700/40 bg-amber-700/10',
	silver: 'text-slate-300 border-slate-400/40 bg-slate-400/10',
	gold: 'text-yellow-400 border-yellow-400/40 bg-yellow-400/10',
};

/**
 * Renders the wallet's volume discount tier badge (bronze/silver/gold),
 * with a tooltip showing how much more volume is needed to reach the next
 * tier. Renders nothing for a wallet with no discount tier yet, per #1102's
 * "no badge shown for wallets with no discount tier" acceptance criterion.
 */
export default function VolumeTierBadge({
	tier,
	cumulativeVolumeStroops,
	className,
}: VolumeTierBadgeProps) {
	if (tier == null) {
		return null;
	}

	const progress = computeTierProgress(cumulativeVolumeStroops);

	const tooltipContent =
		progress.nextTier != null && progress.volumeStroopsToNextTier != null
			? `Trade ${formatDisplayKeyPrice(progress.volumeStroopsToNextTier)} more to reach ${TIER_LABEL[progress.nextTier]}`
			: "You've reached the highest tier";

	return (
		<Tooltip content={tooltipContent}>
			<span
				data-testid="volume-tier-badge"
				data-tier={tier}
				className={cn(
					'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold',
					TIER_BADGE_CLASS[tier],
					className
				)}
			>
				{TIER_LABEL[tier]}
			</span>
		</Tooltip>
	);
}
