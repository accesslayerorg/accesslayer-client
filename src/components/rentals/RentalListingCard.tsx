import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { UnavailableAction } from '@/components/ui/unavailable-action';
import type { RentalListing } from '@/types/keyRental';
import { formatRentalXlm } from '@/utils/keyRental.utils';
import { formatNumber } from '@/utils/numberFormat.utils';

export interface RentalListingCardProps {
	listing: RentalListing;
	/** Why renting is unavailable, or null when the Rent action is enabled. */
	rentDisabledReason: string | null;
	onRent: (listing: RentalListing) => void;
}

function shortAddress(address: string): string {
	return address.length > 12
		? `${address.slice(0, 4)}…${address.slice(-4)}`
		: address;
}

/** One available listing on the rental market (#1360). */
export default function RentalListingCard({
	listing,
	rentDisabledReason,
	onRent,
}: RentalListingCardProps) {
	return (
		<article
			className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
			data-testid="rental-listing-card"
		>
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<Link
						to={`/creators/${encodeURIComponent(listing.keyId)}`}
						className="block truncate font-grotesque text-lg font-bold text-white hover:text-sky-300"
					>
						{listing.keyName}
					</Link>
					<p className="text-xs text-white/50">
						Listed by{' '}
						<span className="font-mono">
							{shortAddress(listing.owner)}
						</span>
					</p>
				</div>
				<span className="shrink-0 rounded-full bg-white/[0.06] px-2.5 py-1 text-xs font-semibold text-white/80">
					{formatNumber(listing.quantity)} key
					{listing.quantity === 1 ? '' : 's'}
				</span>
			</div>

			<dl className="grid grid-cols-3 gap-2 text-sm">
				<div>
					<dt className="text-[11px] uppercase tracking-wider text-white/40">
						Fee / day
					</dt>
					<dd
						className="font-semibold text-white"
						data-testid="rental-listing-fee"
					>
						{formatRentalXlm(listing.feePerDayStroops)} XLM
					</dd>
				</div>
				<div>
					<dt className="text-[11px] uppercase tracking-wider text-white/40">
						Max days
					</dt>
					<dd
						className="font-semibold text-white"
						data-testid="rental-listing-max-days"
					>
						{formatNumber(listing.maxDays)}
					</dd>
				</div>
				<div>
					<dt className="text-[11px] uppercase tracking-wider text-white/40">
						Collateral
					</dt>
					<dd
						className="font-semibold text-white"
						data-testid="rental-listing-collateral"
					>
						{formatRentalXlm(listing.collateralStroops)} XLM
					</dd>
				</div>
			</dl>

			<UnavailableAction
				disabled={rentDisabledReason !== null}
				reason={rentDisabledReason ?? undefined}
			>
				<Button
					type="button"
					className="w-full font-bold"
					onClick={() => onRent(listing)}
					data-testid="rental-listing-rent"
				>
					Rent
				</Button>
			</UnavailableAction>
		</article>
	);
}
