import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchKeyTrades, type KeyTrade } from '@/services/keyTrades.service';

export const KEY_TRADES_POLL_INTERVAL_MS = 30_000;
export const KEY_TRADES_DISPLAY_LIMIT = 5;
const NEW_TRADE_HIGHLIGHT_MS = 2_200;

function mergeTrades(previous: KeyTrade[], incoming: KeyTrade[]): KeyTrade[] {
	const seen = new Set<string>();
	return [...incoming, ...previous]
		.filter(trade => {
			if (seen.has(trade.id)) return false;
			seen.add(trade.id);
			return true;
		})
		.slice(0, KEY_TRADES_DISPLAY_LIMIT);
}

export interface UseKeyTradesResult {
	trades: KeyTrade[];
	newTradeIds: ReadonlySet<string>;
	isLoading: boolean;
	isFetching: boolean;
	isError: boolean;
	refetch: () => Promise<unknown>;
}

/**
 * Loads the five most recent key trades immediately and polls every 30s.
 * Previously seen rows are retained across a poll so rows animate only once
 * when they first appear.
 */
export function useKeyTrades(
	keyId: string,
	limit = KEY_TRADES_DISPLAY_LIMIT
): UseKeyTradesResult {
	const [trades, setTrades] = useState<KeyTrade[]>([]);
	const [newTradeIds, setNewTradeIds] = useState<Set<string>>(new Set());
	const seenIdsRef = useRef<Set<string>>(new Set());
	const initializedRef = useRef(false);

	const query = useQuery({
		queryKey: ['key-trades', keyId, limit],
		queryFn: () => fetchKeyTrades(keyId, limit),
		enabled: Boolean(keyId),
		refetchInterval: KEY_TRADES_POLL_INTERVAL_MS,
	});

	useEffect(() => {
		setTrades([]);
		setNewTradeIds(new Set());
		seenIdsRef.current = new Set();
		initializedRef.current = false;
	}, [keyId, limit]);

	useEffect(() => {
		const incoming = query.data;
		if (!incoming) return;

		if (!initializedRef.current) {
			initializedRef.current = true;
			seenIdsRef.current = new Set(incoming.map(trade => trade.id));
			setTrades(incoming.slice(0, limit));
			return;
		}

		const added = incoming.filter(trade => !seenIdsRef.current.has(trade.id));
		for (const trade of incoming) seenIdsRef.current.add(trade.id);
		setTrades(previous => mergeTrades(previous, incoming));

		if (added.length === 0) return;
		setNewTradeIds(new Set(added.map(trade => trade.id)));
		const timer = window.setTimeout(() => {
			setNewTradeIds(new Set());
		}, NEW_TRADE_HIGHLIGHT_MS);
		return () => window.clearTimeout(timer);
	}, [limit, query.data]);

	return useMemo(
		() => ({
			trades,
			newTradeIds,
			isLoading: query.isLoading,
			isFetching: query.isFetching,
			isError: query.isError,
			refetch: query.refetch,
		}),
		[newTradeIds, query.isError, query.isFetching, query.isLoading, query.refetch, trades]
	);
}

export default useKeyTrades;
