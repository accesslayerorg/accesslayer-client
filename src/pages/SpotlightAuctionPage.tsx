import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useAccount } from 'wagmi';
import { useCreatorDetail } from '@/hooks/useCreators';
import {
	useSpotlightAuction,
	useSpotlightBids,
} from '@/hooks/useSpotlightAuction';
import SpotlightBidForm from '@/components/common/SpotlightBidForm';
import SpotlightMyBids from '@/components/common/SpotlightMyBids';
import { formatAuctionBidAmount, shortenWalletAddress } from '@/utils/auctionBid.utils';
import { formatSpotlightTimeRemaining } from '@/utils/spotlightAuction.utils';

const CARD_CLASS =
	'rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8';

const LABEL_CLASS = 'text-[0.65rem] font-bold uppercase tracking-[0.22em] text-white/40';

/** Re-renders once a second so the round countdown stays live (#1147). */
function useNow(intervalMs = 1_000) {
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
		return () => window.clearInterval(timer);
	}, [intervalMs]);

	return now;
}

/**
 * Spotlight auction page for creator discovery placement (#1147). Shows the
 * current winner and countdown, a Place Bid form, and the wallet's own bids
 * with outbid and refund status.
 */
export default function SpotlightAuctionPage() {
	const { id = '' } = useParams<{ id: string }>();
	const { address } = useAccount();
	const now = useNow();

	const { data: creator } = useCreatorDetail(id);
	const { data: auction, isLoading, isError } = useSpotlightAuction(id);
	const { data: myBids = [], isLoading: isBidsLoading } = useSpotlightBids(id, address);

	if (isLoading) {
		return (
			<main className="min-h-screen bg-[#06111f] px-6 py-16 text-white md:px-12">
				<p className="mx-auto max-w-5xl text-white/50">Loading spotlight auction…</p>
			</main>
		);
	}

	if (isError || !auction) {
		return (
			<main className="min-h-screen bg-[#06111f] px-6 py-16 text-white md:px-12">
				<div className="mx-auto max-w-5xl">
					<h1 className="font-grotesque text-3xl font-black">Spotlight auction</h1>
					<p className="mt-4 text-white/60" data-testid="spotlight-error">
						We couldn&apos;t load the spotlight auction. Try again shortly.
					</p>
				</div>
			</main>
		);
	}

	const timeRemaining = formatSpotlightTimeRemaining(auction.endsAt, now);
	const isRoundOpen = timeRemaining !== null;
	const isWalletWinning =
		Boolean(address) &&
		auction.currentWinnerWallet?.toLowerCase() === address?.toLowerCase();

	return (
		<main className="min-h-screen bg-[#06111f] px-6 py-16 text-white md:px-12">
			<div className="mx-auto max-w-5xl space-y-8">
				<div>
					<Link
						to={`/creator/${id}/dashboard`}
						className="text-sm font-semibold text-amber-300 underline-offset-4 hover:text-amber-200 hover:underline"
					>
						← Back to dashboard
					</Link>
					<h1 className="mt-4 font-grotesque text-3xl font-black tracking-tight">
						{creator?.title ?? 'Creator'} · Spotlight auction
					</h1>
					<p className="mt-2 text-sm text-white/50">
						Bid for premium discovery placement. The highest bid holds the spotlight when the round closes.
					</p>
				</div>

				<section className={CARD_CLASS} aria-labelledby="spotlight-status-heading" data-testid="spotlight-status">
					<h2 id="spotlight-status-heading" className="mb-6 font-grotesque text-xl font-black tracking-tight">
						Current round
					</h2>
					<dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
						<div>
							<dt className={LABEL_CLASS}>Current winner</dt>
							<dd className="mt-1 font-jakarta font-bold" data-testid="spotlight-current-winner">
								{auction.currentWinnerWallet
									? isWalletWinning
										? 'You'
										: shortenWalletAddress(auction.currentWinnerWallet)
									: 'Unclaimed'}
							</dd>
						</div>
						<div>
							<dt className={LABEL_CLASS}>Highest bid</dt>
							<dd className="mt-1 font-jakarta font-bold text-amber-400" data-testid="spotlight-highest-bid">
								{auction.highestBid != null
									? formatAuctionBidAmount(auction.highestBid)
									: 'No bids yet'}
							</dd>
						</div>
						<div>
							<dt className={LABEL_CLASS}>Time remaining</dt>
							<dd className="mt-1 font-jakarta font-bold" data-testid="spotlight-time-remaining">
								{isRoundOpen ? timeRemaining : 'Round closed'}
							</dd>
						</div>
					</dl>
				</section>

				<section className={CARD_CLASS} aria-labelledby="spotlight-bid-heading">
					<h2 id="spotlight-bid-heading" className="mb-1 font-grotesque text-xl font-black tracking-tight">
						Place bid
					</h2>
					<p className="mb-6 text-sm text-white/50">
						{address
							? 'Pick a slot and enter at least the minimum bid.'
							: 'Connect your wallet to place a spotlight bid.'}
					</p>
					<SpotlightBidForm
						creatorId={id}
						slots={auction.slots}
						highestBid={auction.highestBid}
						minIncrement={auction.minIncrement}
						disabled={!isRoundOpen || !address}
					/>
				</section>

				<section className={CARD_CLASS} aria-labelledby="spotlight-my-bids-heading">
					<h2 id="spotlight-my-bids-heading" className="mb-6 font-grotesque text-xl font-black tracking-tight">
						My bids
					</h2>
					{address ? (
						<SpotlightMyBids bids={myBids} isLoading={isBidsLoading} />
					) : (
						<p className="text-sm text-white/50">Connect your wallet to see your bids.</p>
					)}
				</section>
			</div>
		</main>
	);
}
