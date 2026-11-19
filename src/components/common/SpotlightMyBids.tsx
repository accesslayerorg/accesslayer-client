import type { SpotlightBid } from '@/services/spotlightAuction.service';
import { formatAuctionBidAmount } from '@/utils/auctionBid.utils';

const STATUS_LABELS: Record<SpotlightBid['status'], string> = {
	leading: 'Leading',
	outbid: 'Outbid',
	won: 'Won',
};

interface SpotlightMyBidsProps {
	bids: SpotlightBid[];
	isLoading?: boolean;
}

/**
 * The connected creator's spotlight bids, with outbid status and any refund
 * still owed back to the wallet (#1147).
 */
export default function SpotlightMyBids({ bids, isLoading = false }: SpotlightMyBidsProps) {
	if (isLoading) {
		return <p className="text-sm text-white/50">Loading your bids…</p>;
	}

	if (bids.length === 0) {
		return (
			<p className="text-sm text-white/50" data-testid="spotlight-my-bids-empty">
				You have no spotlight bids yet.
			</p>
		);
	}

	return (
		<ul className="space-y-3" data-testid="spotlight-my-bids">
			{bids.map(bid => (
				<li
					key={bid.id}
					className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
				>
					<div>
						<p className="font-bold text-white">{bid.slotLabel}</p>
						<p className="text-xs text-white/50">
							{formatAuctionBidAmount(bid.amount)}
						</p>
					</div>

					<div className="flex flex-wrap items-center gap-2">
						<span
							data-testid="spotlight-bid-status"
							className={
								bid.status === 'outbid'
									? 'rounded-full border border-red-400/30 bg-red-400/10 px-2.5 py-0.5 text-xs font-bold text-red-300'
									: 'rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-xs font-bold text-emerald-300'
							}
						>
							{STATUS_LABELS[bid.status]}
						</span>

						{bid.status === 'outbid' && bid.refundPending > 0 && (
							<span
								data-testid="spotlight-refund-pending"
								className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-0.5 text-xs font-bold text-amber-300"
							>
								Refund pending: {formatAuctionBidAmount(bid.refundPending)}
							</span>
						)}
					</div>
				</li>
			))}
		</ul>
	);
}
