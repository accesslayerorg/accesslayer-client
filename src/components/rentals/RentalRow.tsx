import { Button } from '@/components/ui/button';
import type { RentalListing } from '@/types/keyRental';
import {
	canClaimCollateral,
	canEndRental,
	formatRentalXlm,
	getRentalPhase,
	getRentalRemainingSeconds,
} from '@/utils/keyRental.utils';
import { formatUnlockCountdown } from '@/utils/lockupCountdown.utils';
import { formatNumber } from '@/utils/numberFormat.utils';

export interface RentalRowProps {
	listing: RentalListing;
	/** Connected wallet, used to decide who may claim the collateral. */
	wallet: string;
	nowMs: number;
	/** Disables both actions, e.g. while a transaction is pending. */
	actionsDisabled?: boolean;
	onEndRental: (listing: RentalListing) => void;
	onClaimCollateral: (listing: RentalListing) => void;
}

function statusLabel(listing: RentalListing, nowMs: number): string {
	switch (getRentalPhase(listing, nowMs)) {
		case 'available':
			return 'Waiting for a renter';
		case 'active':
			return listing.expiresAtMs == null
				? 'Rented'
				: `${formatUnlockCountdown(getRentalRemainingSeconds(listing.expiresAtMs, nowMs))} remaining`;
		case 'expired':
			return 'Expired, ready to end';
		case 'overdue':
			return 'Grace period over';
		default:
			return 'Closed';
	}
}

/**
 * A rental on the My Rentals page (#1360). End rental appears only once the
 * rental has expired, and Claim collateral only for the owner after the grace
 * period.
 */
export default function RentalRow({
	listing,
	wallet,
	nowMs,
	actionsDisabled = false,
	onEndRental,
	onClaimCollateral,
}: RentalRowProps) {
	const showEnd = canEndRental(listing, nowMs);
	const showClaim = canClaimCollateral(listing, wallet, nowMs);

	return (
		<li
			className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between"
			data-testid="rental-row"
		>
			<div className="min-w-0 space-y-1">
				<p className="truncate font-semibold text-white">
					{listing.keyName}
					<span className="ml-2 text-xs font-normal text-white/50">
						{formatNumber(listing.quantity)} key
						{listing.quantity === 1 ? '' : 's'}
					</span>
				</p>
				<p className="text-xs text-white/60">
					{formatRentalXlm(listing.feePerDayStroops)} XLM/day · up to{' '}
					{formatNumber(listing.maxDays)} days ·{' '}
					{formatRentalXlm(listing.collateralStroops)} XLM collateral
				</p>
				<p
					className="text-xs font-semibold text-sky-300"
					data-testid="rental-row-status"
				>
					{statusLabel(listing, nowMs)}
				</p>
			</div>

			{(showEnd || showClaim) && (
				<div className="flex shrink-0 gap-2">
					{showEnd && (
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => onEndRental(listing)}
							disabled={actionsDisabled}
							data-testid="rental-row-end"
						>
							End rental
						</Button>
					)}
					{showClaim && (
						<Button
							type="button"
							size="sm"
							onClick={() => onClaimCollateral(listing)}
							disabled={actionsDisabled}
							data-testid="rental-row-claim"
						>
							Claim collateral
						</Button>
					)}
				</div>
			)}
		</li>
	);
}
