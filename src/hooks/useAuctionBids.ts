import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
	courseService,
	type AuctionBidEntry,
} from '@/services/course.service';

// #924 — the bid history must stay live while the auction runs. Polling every
// 8s keeps the leaderboard (and the "you've been outbid" state) current
// without a manual refresh, mirroring the marketplace price polling in #918.
const AUCTION_BID_POLL_INTERVAL_MS = 8_000;

/**
 * Live pre-launch auction bid history for a key (#924).
 *
 * Polls `GET /keys/:keyId/auction/bids` on a fixed cadence so the bid list and
 * the current leader reflect new bids shortly after they land. `fallback`
 * lets callers seed the list from the creator detail payload so the panel is
 * populated even before the first poll resolves. When the endpoint is not
 * available yet the query simply reports no data — components should fall
 * back to `fallback`/derived values rather than erroring.
 */
export function useAuctionBids(
	creatorId: string,
	fallback: AuctionBidEntry[] | null | undefined = []
) {
	const query = useQuery({
		queryKey: queryKeys.creators.auctionBids(creatorId),
		queryFn: () => courseService.getAuctionBids(creatorId),
		enabled: Boolean(creatorId),
		refetchInterval: AUCTION_BID_POLL_INTERVAL_MS,
	});

	const liveBids = query.data ?? [];
	const bids = liveBids.length > 0 ? liveBids : (fallback ?? []);

	return {
		bids,
		isLoading: query.isLoading,
		refetch: query.refetch,
	};
}