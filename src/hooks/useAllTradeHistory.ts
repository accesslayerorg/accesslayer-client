import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
	tradeHistoryService,
	type Trade,
} from '@/services/tradeHistory.service';

/** Safety cap so a runaway cursor can never loop forever. */
export const MAX_TRADE_HISTORY_PAGES = 200;

/**
 * Loads every page of a wallet's trade history (following the cursor) so the
 * portfolio table can filter, paginate and export all matching rows (#857, #1114).
 */
export async function fetchAllTrades(wallet: string): Promise<Trade[]> {
	const trades: Trade[] = [];
	const seen = new Set<string>();
	let cursor: string | null = null;

	for (let page = 0; page < MAX_TRADE_HISTORY_PAGES; page++) {
		const result = await tradeHistoryService.getTradeHistory({
			wallet,
			cursor,
		});
		for (const trade of result.trades) {
			if (seen.has(trade.id)) continue;
			seen.add(trade.id);
			trades.push(trade);
		}
		if (!result.nextCursor || result.nextCursor === cursor) break;
		cursor = result.nextCursor;
	}

	return trades;
}

export function useAllTradeHistory(wallet: string | undefined) {
	return useQuery<Trade[]>({
		queryKey: queryKeys.wallet.allTradeHistory(wallet ?? ''),
		queryFn: () => fetchAllTrades(wallet!),
		enabled: Boolean(wallet),
		staleTime: 15_000,
	});
}
