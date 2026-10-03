import { useAccount } from 'wagmi';
import type { AuctionBidEntry } from '@/services/course.service';
import { useAuctionBids } from '@/hooks/useAuctionBids';
import { useAuctionPhase } from '@/hooks/useAuctionPhase';
import AuctionBidHistory from '@/components/common/AuctionBidHistory';
import AuctionBidPanel from '@/components/common/AuctionBidPanel';
import AuctionCountdown from '@/components/common/AuctionCountdown';
import {
	findWalletBestBid,
	formatAuctionBidAmount,
	isWalletLeadingAuction,
	resolveHighestBid,
} from '@/utils/auctionBid.utils';

export interface AuctionPhaseSectionProps {
	creatorId: string;
	/** Fixed early-access price in XLM; used as the starting bid floor. */
	auctionPrice?: number | null;
	/** Number of keys allocated to the auction. */
	auctionSupply?: number | null;
	/** Keys sold through the auction so far. */
	auctionSold?: number | null;
	/** ISO timestamp when the bidding window closes and the curve activates. */
	auctionEndsAt?: string | null;
	/** Minimum increment a new bid must beat the current high bid by (XLM). */
	auctionMinIncrement?: number | null;
	/** Explicit current highest bid in XLM, when the backend provides it. */
	auctionHighestBid?: number | null;
	/** Initial bid history from the creator detail payload. */
	auctionBids?: AuctionBidEntry[];
}

/**
 * Pre-launch auction phase UI for a creator key (#924).
 *
 * Composes the countdown to auction close, the bidding panel (current highest
 * bid + minimum increment + validated bid submission), the live top-bidders
 * history, the outbid notice when the connected wallet is no longer leading,
 * and the transition banner once the auction closes and the bonding curve
 * activates. Renders nothing for keys without an auction configured.
 */
const AuctionPhaseSection: React.FC<AuctionPhaseSectionProps> = ({
	creatorId,
	auctionPrice,
	auctionSupply,
	auctionSold,
	auctionEndsAt,
	auctionMinIncrement,
	auctionHighestBid,
	auctionBids,
}) => {
	const config = { auctionPrice, auctionSupply, auctionSold, auctionEndsAt };
	const { phase, countdown } = useAuctionPhase(config);
	const { address } = useAccount();
	const { bids } = useAuctionBids(creatorId, auctionBids);

	if (phase === 'inactive') return null;

	const highestBid = resolveHighestBid(bids, auctionHighestBid);
	const isLeading = isWalletLeadingAuction(bids, address);
	const walletBest = findWalletBestBid(bids, address);

	const isActive = phase === 'active';

	const supply = auctionSupply && auctionSupply > 0 ? auctionSupply : null;
	const sold =
		auctionSold != null && auctionSold >= 0 && supply != null
			? Math.min(auctionSold, supply)
			: null;
	const remaining = supply != null && sold != null ? supply - sold : null;
	const progressPercent =
		supply != null && sold != null ? Math.min(100, (sold / supply) * 100) : 0;

	const isOutbid = Boolean(walletBest && !isLeading);

	return (
		<section
			className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-5 shadow-2xl backdrop-blur-md md:p-6"
			data-testid="auction-phase-section"
			aria-label="Pre-launch auction"
		>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">
						Auction Phase
					</p>
					<h2 className="mt-1 font-grotesque text-xl font-black tracking-tight text-white">
						Pre-Launch Auction
					</h2>
					<p className="mt-1 max-w-xl text-sm text-white/50">
						This key starts trading on the bonding curve when the auction
						closes. The leading bid secures the first allocation.
					</p>
				</div>
				<AuctionCountdown
					label={isActive ? countdown.label : (countdown.label ?? '0s')}
					isEnded={!isActive}
					className="sm:mt-1"
				/>
			</div>

			{supply != null && remaining != null && (
				<div className="mt-5" data-testid="auction-supply-progress">
					<div className="flex items-center justify-between gap-4 text-xs">
						<p className="font-semibold uppercase tracking-[0.15em] text-white/50">
							Early access allocation
						</p>
						<p className="text-white/60">
							<span className="font-bold text-amber-300">{remaining}</span>{' '}
							of {supply} keys left
						</p>
					</div>
					<div
						className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10"
						role="progressbar"
						aria-valuenow={Math.round(progressPercent)}
						aria-valuemin={0}
						aria-valuemax={100}
					>
						<div
							className="h-full rounded-full bg-amber-400 transition-all"
							style={{ width: `${progressPercent}%` }}
						/>
					</div>
				</div>
			)}

			{isActive ? (
				<>
					{isOutbid && highestBid != null && (
						<div
							role="alert"
							data-testid="auction-outbid-notice"
							className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3"
						>
							<p className="font-jakarta text-sm font-bold text-rose-300">
								You've been outbid
							</p>
							<p className="mt-0.5 text-xs text-white/60">
								Your bid is no longer the highest. The current lead is{' '}
								<span className="font-semibold text-rose-200">
									{formatAuctionBidAmount(highestBid)}
								</span>
								— place a higher bid to retake the lead.
							</p>
						</div>
					)}

					<div className="mt-5" data-testid="auction-bid-panel-container">
						<AuctionBidPanel
							creatorId={creatorId}
							highestBid={highestBid}
							minIncrement={auctionMinIncrement}
							startingPrice={auctionPrice}
						/>
					</div>

					<div className="mt-6">
						<h3 className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-white/50">
							Top bids
						</h3>
						<AuctionBidHistory bids={bids} walletAddress={address} />
					</div>
				</>
			) : (
				<div
					data-testid="auction-ended-transition"
					className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-4"
				>
					<p className="font-grotesque text-base font-black text-emerald-300">
						Auction closed — the bonding curve is now live
					</p>
					<p className="mt-1 text-sm text-white/60">
						Trading has started at the bonding curve price below. New keys
						can be bought and sold without a bid.
						{highestBid != null && (
							<span className="mt-1 block text-xs text-white/50">
								Winning bid:{' '}
								<span className="font-semibold text-emerald-200">
									{formatAuctionBidAmount(highestBid)}
								</span>
							</span>
						)}
					</p>
				</div>
			)}
		</section>
	);
};

export default AuctionPhaseSection;