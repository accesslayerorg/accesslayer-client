import { Trophy } from 'lucide-react';
import type { AuctionBidEntry } from '@/services/course.service';
import { useRelativeTime } from '@/hooks/useRelativeTime';
import {
	formatAuctionBidAmount,
	rankAuctionBids,
	shortenWalletAddress,
} from '@/utils/auctionBid.utils';

interface AuctionBidHistoryProps {
	/** Live bid history (newest first is not required — rank handles it). */
	bids: AuctionBidEntry[];
	/** Connected wallet to highlight the caller's own bids. */
	walletAddress?: string | null;
}

interface BidRowProps {
	rank: number;
	bid: AuctionBidEntry;
	isMine: boolean;
}

function BidRow({ rank, bid, isMine }: BidRowProps) {
	const placedAtLabel = useRelativeTime(bid.placedAt);
	const bidderLabel = bid.bidderName || shortenWalletAddress(bid.bidderAddress);

	return (
		<li
			data-testid="auction-bid-row"
			className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${
				isMine ? 'bg-amber-500/10 ring-1 ring-inset ring-amber-400/20' : ''
			}`}
		>
			<span
				className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums ${
					rank === 1
						? 'bg-amber-400/20 text-amber-300'
						: rank === 2
							? 'bg-white/10 text-white/70'
							: 'bg-white/5 text-white/40'
				}`}
				aria-hidden="true"
			>
				{rank === 1 ? <Trophy className="size-3.5" /> : rank}
			</span>
			<span
				className="min-w-0 flex-1 truncate font-jakarta text-sm font-semibold text-white"
				title={bid.bidderAddress}
				data-testid="auction-bid-bidder"
			>
				{bidderLabel}
				{isMine && (
					<span className="ml-2 rounded bg-amber-400/20 px-1.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-amber-300">
						You
					</span>
				)}
			</span>
			<span className="text-xs text-white/40" aria-hidden="true">
				{placedAtLabel}
			</span>
			<span
				className="font-grotesque text-sm font-black tabular-nums text-amber-400"
				data-testid="auction-bid-amount"
			>
				{formatAuctionBidAmount(bid.amount)}
			</span>
		</li>
	);
}

/**
 * Leaderboard of the bids placed during a key's pre-launch auction (#924).
 * Live-updating via the parent's polling hook; the caller's own bids are
 * highlighted so the "you've been outbid" context is obvious.
 */
const AuctionBidHistory: React.FC<AuctionBidHistoryProps> = ({
	bids,
	walletAddress,
}) => {
	const ranked = rankAuctionBids(bids);
	const normalizedWallet = walletAddress?.trim().toLowerCase();

	if (ranked.length === 0) {
		return (
			<div
				className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center"
				data-testid="auction-bid-history-empty"
			>
				<p className="font-jakarta text-sm font-semibold text-white/70">
					No bids yet
				</p>
				<p className="mt-1 text-xs text-white/40">
					Be the first to bid and lock in the leading position.
				</p>
			</div>
		);
	}

	return (
		<div data-testid="auction-bid-history">
			<ol className="space-y-1">
				{ranked.map((bid, index) => (
					<BidRow
						key={bid.id}
						rank={index + 1}
						bid={bid}
						isMine={
							bid.bidderAddress.trim().toLowerCase() === normalizedWallet
						}
					/>
				))}
			</ol>
		</div>
	);
};

export default AuctionBidHistory;