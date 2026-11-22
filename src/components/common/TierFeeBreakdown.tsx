/**
 * Fee discount tier badge and breakdown for the trade confirmation screen
 * (#1102): shows the wallet's tier badge, the base fee, the tier discount
 * applied, and the final effective fee.
 */
import VolumeTierBadge from '@/components/common/VolumeTierBadge';
import { formatDisplayKeyPrice } from '@/utils/keyPriceDisplay.utils';
import { bpsToPercent } from '@/utils/numberFormat.utils';
import {
	getTierDiscountBps,
	type VolumeDiscountTier,
} from '@/utils/volumeDiscountTier.utils';

export interface TierFeeBreakdownProps {
	/** The wallet's current tier, or null when it has no discount tier yet. */
	tier: VolumeDiscountTier | null;
	/** The wallet's cumulative trading volume in stroops, for the tier-progress tooltip. */
	cumulativeVolumeStroops: number;
	/** Base fee for this trade, before the tier discount, in stroops. */
	baseFeeStroops: number;
}

/**
 * Renders the tier badge plus a base fee / discount / final fee breakdown.
 * When the wallet has no tier, the badge is omitted and the discount row
 * shows 0, matching #1102's acceptance criteria.
 */
export default function TierFeeBreakdown({
	tier,
	cumulativeVolumeStroops,
	baseFeeStroops,
}: TierFeeBreakdownProps) {
	const discountBps = getTierDiscountBps(tier);
	const discountStroops = Math.round((baseFeeStroops * discountBps) / 10_000);
	const finalFeeStroops = baseFeeStroops - discountStroops;

	return (
		<div data-testid="tier-fee-breakdown" className="space-y-2">
			<div className="flex items-center justify-between">
				<span className="text-xs text-white/45">Tier</span>
				<VolumeTierBadge
					tier={tier}
					cumulativeVolumeStroops={cumulativeVolumeStroops}
				/>
			</div>
			<div className="flex items-center justify-between text-sm">
				<span className="text-white/45">Base fee</span>
				<span data-testid="tier-fee-base">
					{formatDisplayKeyPrice(baseFeeStroops)}
				</span>
			</div>
			<div className="flex items-center justify-between text-sm">
				<span className="text-white/45">
					Tier discount ({bpsToPercent(discountBps)})
				</span>
				<span
					data-testid="tier-fee-discount"
					className={discountStroops > 0 ? 'text-emerald-400' : undefined}
				>
					-{formatDisplayKeyPrice(discountStroops)}
				</span>
			</div>
			<div className="flex items-center justify-between text-sm font-semibold">
				<span className="text-white/70">Final fee</span>
				<span data-testid="tier-fee-final">
					{formatDisplayKeyPrice(finalFeeStroops)}
				</span>
			</div>
		</div>
	);
}
