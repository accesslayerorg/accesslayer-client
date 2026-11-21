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
	rankAuctionBids,
	resolveHighestBid,
	shortenWalletAddress,
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
	/** Final clearing price for settled auction in XLM (#1164). */
	auctionClearingPrice?: number | null;
	/** Total allocation of keys distributed in the auction (#1164). */
	auctionAllocation?: number | null;
	/** Explicit settlement indicator flag (#1164). */
	auctionSettled?: boolean | null;
	/** User address override. */
	userAddress?: string | null;
}

/**
 * Key launch auction UI for initial price discovery bidding (#924, #1164).
 *
 * Shows live bids, countdown timer, minimum bid requirements, escrow notice,
 * and post-auction settlement details (clearing price and key allocation).
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
	auctionClearingPrice,
	auctionAllocation,
	auctionSettled,
	userAddress,
}) => {
	const config = {
		auctionPrice,
		auctionSupply,
		auctionSold,
		auctionEndsAt,
		auctionSettled,
	};
	const { phase, countdown } = useAuctionPhase(config);
	const { address: wagmiAddress } = useAccount();
	const activeAddress = userAddress ?? wagmiAddress;
	const { bids } = useAuctionBids(creatorId, auctionBids);

	if (phase === 'inactive') return null;

	const highestBid = resolveHighestBid(bids, auctionHighestBid);
	const isLeading = isWalletLeadingAuction(bids, activeAddress);
	const walletBest = findWalletBestBid(bids, activeAddress);

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

	// Post-auction settlement resolution (#1164)
	const clearingPrice =
		auctionClearingPrice ?? highestBid ?? auctionPrice ?? 0;
	const allocation = auctionAllocation ?? auctionSold ?? auctionSupply ?? 0;
	const rankedBids = rankAuctionBids(bids);
	const winningBid = rankedBids[0];

	return (
		<section
			className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-5 shadow-2xl backdrop-blur-md md:p-6"
			data-testid="auction-phase-section"
			data-auction-panel="true"
			aria-label="Pre-launch auction"
		>
			<div data-testid="auction-panel">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
					<div>
						<p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">
							Auction Phase
						</p>
						<h2 className="mt-1 font-grotesque text-xl font-black tracking-tight text-white">
							{isActive
								? 'Pre-Launch Auction'
								: 'Launch Auction Settled'}
						</h2>
						<p className="mt-1 max-w-xl text-sm text-white/50">
							{isActive
								? 'This key starts trading on the bonding curve when the auction closes. The leading bid secures the first allocation.'
								: 'Auction bidding has closed and the initial key allocation is settled. Bonding curve trading is now live.'}
						</p>
					</div>
					<AuctionCountdown
						label={isActive ? countdown.label : (countdown.label ?? '0s')}
						isEnded={!isActive}
						className="sm:mt-1"
					/>
				</div>

				{supply != null && remaining != null && isActive && (
					<div className="mt-5" data-testid="auction-supply-progress">
						<div className="flex items-center justify-between gap-4 text-xs">
							<p className="font-semibold uppercase tracking-[0.15em] text-white/50">
								Early access allocation
							</p>
							<p className="text-white/60">
								<span className="font-bold text-amber-300">
									{remaining}
								</span>{' '}
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
									Your bid is no longer the highest. The current lead
									is{' '}
									<span className="font-semibold text-rose-200">
										{formatAuctionBidAmount(highestBid)}
									</span>
									— place a higher bid to retake the lead.
								</p>
							</div>
						)}

						<div
							className="mt-5"
							data-testid="auction-bid-panel-container"
						>
							<AuctionBidPanel
								creatorId={creatorId}
								highestBid={highestBid}
								minIncrement={auctionMinIncrement}
								startingPrice={auctionPrice}
								userAddress={activeAddress}
							/>
						</div>

						<div className="mt-6">
							<h3 className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-white/50">
								Top bids
							</h3>
							<AuctionBidHistory
								bids={bids}
								walletAddress={activeAddress}
							/>
						</div>
					</>
				) : (
					/* Post-auction panel showing clearing price and allocation once settled (#1164) */
					<div
						data-testid="auction-ended-transition"
						className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 shadow-lg backdrop-blur-md"
					>
						<div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
							<div>
								<span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-300">
									✓ Auction Settled
								</span>
								<h3 className="mt-2 font-grotesque text-base font-black text-emerald-300">
									Auction closed — the bonding curve is now live
								</h3>
								<p className="mt-1 text-sm text-white/60">
									Trading has started at the bonding curve price below.
									New keys can be bought and sold without a bid.
								</p>
							</div>
						</div>

						<div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
							<div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-3.5">
								<p className="text-xs font-bold uppercase tracking-wider text-emerald-300/80">
									Clearing Price
								</p>
								<p
									className="mt-1 font-grotesque text-lg font-black text-emerald-200"
									data-testid="auction-clearing-price"
								>
									{formatAuctionBidAmount(clearingPrice)}
								</p>
							</div>

							<div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-3.5">
								<p className="text-xs font-bold uppercase tracking-wider text-emerald-300/80">
									Settled Allocation
								</p>
								<p
									className="mt-1 font-grotesque text-lg font-black text-white"
									data-testid="auction-allocation"
								>
									{allocation} {allocation === 1 ? 'key' : 'keys'}
								</p>
							</div>

							{winningBid && (
								<div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-3.5">
									<p className="text-xs font-bold uppercase tracking-wider text-emerald-300/80">
										Winning Bidder
									</p>
									<p
										className="mt-1 truncate font-jakarta text-sm font-semibold text-white"
										data-testid="auction-winning-bidder"
										title={winningBid.bidderAddress}
									>
										{shortenWalletAddress(winningBid.bidderAddress)}
									</p>
								</div>
							)}
						</div>
					</div>
				)}
			</div>
		</section>
	);
};

export default AuctionPhaseSection;
