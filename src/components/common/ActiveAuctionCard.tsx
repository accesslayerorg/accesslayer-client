/**
 * Active auction card (#1174).
 * Shown on the key detail page to the auction's seller, surfacing the
 * current highest bid, reserve, and countdown.
 */

import React from 'react';
import { formatDisplayKeyPrice } from '@/utils/keyPriceDisplay.utils';
import {
	isAuctionSeller,
	type ActiveAuction,
} from '@/utils/auction.utils';
import { useRelativeTime } from '@/hooks/useRelativeTime';

export interface ActiveAuctionCardProps {
	auction: ActiveAuction;
	/** Connected wallet — used to decide the seller-only styling. */
	walletAddress?: string | null;
}

const ActiveAuctionCard: React.FC<ActiveAuctionCardProps> = ({
	auction,
	walletAddress = null,
}) => {
	const endsIn = useRelativeTime(auction.endsAt);
	const isSeller = isAuctionSeller(auction, walletAddress);
	const hasBids = auction.highestBidStroops > 0;

	return (
		<div
			className={`rounded-xl border p-4 ${
				isSeller
					? 'border-amber-300/30 bg-amber-300/[0.04]'
					: 'border-white/10 bg-white/[0.02]'
			}`}
			data-testid="active-auction-card"
			data-status={auction.status}
			data-is-seller={isSeller}
		>
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<p className="text-xs text-white/60">
						{isSeller ? 'Your auction' : 'Auction'}
					</p>
					<p className="text-sm font-semibold text-white">
						{auction.fractionAmount} fraction
						{auction.fractionAmount === 1 ? '' : 's'}
					</p>
				</div>
				<span
					className="rounded-full border border-white/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/70"
					data-testid="auction-status"
				>
					{auction.status}
				</span>
			</div>

			<dl className="mt-4 space-y-2 text-xs">
				<div className="flex justify-between">
					<dt className="text-white/60">Reserve</dt>
					<dd className="font-mono text-white/90" data-testid="auction-reserve">
						{formatDisplayKeyPrice(auction.reservePriceStroops)}
					</dd>
				</div>
				<div className="flex justify-between">
					<dt className="text-white/60">Highest bid</dt>
					<dd
						className={`font-mono ${hasBids ? 'text-amber-300/90' : 'text-white/50'}`}
						data-testid="auction-highest-bid"
					>
						{hasBids ? formatDisplayKeyPrice(auction.highestBidStroops) : 'No bids yet'}
					</dd>
				</div>
				{auction.highestBidder && (
					<div className="flex justify-between">
						<dt className="text-white/60">Top bidder</dt>
						<dd className="font-mono text-white/80" data-testid="auction-highest-bidder">
							{auction.highestBidder}
						</dd>
					</div>
				)}
				<div className="flex justify-between">
					<dt className="text-white/60">Ends</dt>
					<dd className="font-mono text-white/90" data-testid="auction-ends">
						{endsIn}
					</dd>
				</div>
			</dl>
		</div>
	);
};

export default ActiveAuctionCard;
