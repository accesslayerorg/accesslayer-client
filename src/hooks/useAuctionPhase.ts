import { useEffect, useState } from 'react';
import {
	getAuctionCountdownState,
	getAuctionPhaseStatus,
	type AuctionCountdownState,
	type AuctionPhaseConfig,
	type AuctionPhaseStatus,
} from '@/utils/auctionBid.utils';

/**
 * Tracks the live pre-launch auction state for a key (#924).
 *
 * Re-evaluates the phase every second so the countdown is accurate to the
 * auction end timestamp and the UI flips to the "auction ended / bonding
 * curve live" transition at the right moment without a manual refresh. The
 * interval is only running while the key actually has an auction configured.
 */
export function useAuctionPhase(config: AuctionPhaseConfig) {
	const [nowMs, setNowMs] = useState(() => Date.now());

	const hasAuction =
		getAuctionPhaseStatus(config, Date.now()) !== 'inactive';

	useEffect(() => {
		if (!hasAuction) return;

		setNowMs(Date.now());
		const id = window.setInterval(() => setNowMs(Date.now()), 1000);
		return () => window.clearInterval(id);
	}, [
		hasAuction,
		config.auctionEndsAt,
		config.auctionPrice,
		config.auctionSupply,
		config.auctionSold,
	]);

	const phase: AuctionPhaseStatus = getAuctionPhaseStatus(config, nowMs);
	const countdown: AuctionCountdownState = getAuctionCountdownState(
		config.auctionEndsAt,
		nowMs
	);

	return { phase, countdown };
}