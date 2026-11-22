import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { spotlightAuctionService } from '@/services/spotlightAuction.service';

// Spotlight bids move slower than marketplace trades, so a 15s poll keeps the
// leader, countdown and outbid state current without hammering the API.
const SPOTLIGHT_POLL_INTERVAL_MS = 15_000;

/** Live spotlight round for a creator (#1147). */
export function useSpotlightAuction(creatorId: string) {
	return useQuery({
		queryKey: queryKeys.creators.spotlightAuction(creatorId),
		queryFn: () => spotlightAuctionService.getSpotlightAuction(creatorId),
		enabled: Boolean(creatorId),
		refetchInterval: SPOTLIGHT_POLL_INTERVAL_MS,
	});
}

/** The connected wallet's spotlight bids, including outbid and refund status (#1147). */
export function useSpotlightBids(creatorId: string, wallet: string | undefined) {
	return useQuery({
		queryKey: [...queryKeys.creators.spotlightBids(creatorId), wallet ?? ''],
		queryFn: () =>
			spotlightAuctionService.getSpotlightBids(creatorId, wallet ?? ''),
		enabled: Boolean(creatorId && wallet),
		refetchInterval: SPOTLIGHT_POLL_INTERVAL_MS,
	});
}

/** The marketplace-wide spotlighted key, or null when no placement is live (#1219). */
export function useActiveSpotlight() {
	return useQuery({
		queryKey: queryKeys.creators.discovery.spotlight(),
		queryFn: () => spotlightAuctionService.getActiveSpotlight(),
		refetchInterval: SPOTLIGHT_POLL_INTERVAL_MS,
	});
}
