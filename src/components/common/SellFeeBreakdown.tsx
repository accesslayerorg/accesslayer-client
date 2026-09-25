/**
 * Sell fee breakdown display component.
 * Shows estimated gross proceeds and, when the key is still within its
 * 7-day launch window, the launch penalty deducted and the resulting net
 * proceeds (#825).
 */

import { formatDisplayKeyPrice } from '@/utils/keyPriceDisplay.utils';
import { bpsToPercent } from '@/utils/numberFormat.utils';
import type { LaunchPenaltyBreakdown } from '@/utils/launchPenalty.utils';

export interface SellFeeBreakdownProps {
	/** Estimated gross proceeds in stroops, before any launch penalty. */
	grossProceedsStroops: number | null;
	/** Launch penalty breakdown computed for this sell. */
	launchPenalty: LaunchPenaltyBreakdown;
}

/**
 * Displays the sell proceeds estimate. When `launchPenalty.applies` is
 * true, also renders the penalty amount deducted and the net proceeds
 * remaining after the penalty.
 */
const SellFeeBreakdown: React.FC<SellFeeBreakdownProps> = ({
	grossProceedsStroops,
	launchPenalty,
}) => {
	return (
		<div className="text-xs text-white/45 mt-2" data-testid="sell-fee-breakdown">
			{grossProceedsStroops != null ? (
				<>
					<div className="flex justify-between items-center">
						<span>Estimated proceeds (approximate)</span>
						<span className="font-semibold text-amber-300/90 tabular-nums">
							{formatDisplayKeyPrice(grossProceedsStroops)}
						</span>
					</div>

					{launchPenalty.applies && (
						<>
							<div
								className="flex justify-between items-center mt-1"
								data-testid="sell-fee-breakdown-penalty"
							>
								<span className="text-yellow-300/80">
									Launch penalty ({bpsToPercent(launchPenalty.penaltyBps)})
								</span>
								<span className="font-mono text-yellow-300/90 tabular-nums">
									-{formatDisplayKeyPrice(launchPenalty.penaltyStroops)}
								</span>
							</div>
							<div
								className="flex justify-between items-center mt-1 pt-1 border-t border-white/10"
								data-testid="sell-fee-breakdown-net"
							>
								<span className="font-semibold text-white/70">
									Net proceeds
								</span>
								<span className="font-semibold text-amber-300/90 tabular-nums">
									{formatDisplayKeyPrice(launchPenalty.netProceedsStroops)}
								</span>
							</div>
						</>
					)}
				</>
			) : (
				<>Estimated proceeds unavailable</>
			)}
		</div>
	);
};

export default SellFeeBreakdown;
