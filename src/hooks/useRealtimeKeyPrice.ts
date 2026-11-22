import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { STROOPS_PER_XLM } from '@/constants/stellar';
import { queryKeys } from '@/lib/queryKeys';
import {
	keyPriceSocket,
	type KeyPriceSocketStatus,
	type KeyPriceUpdate,
} from '@/services/realtime.service';
import type {
	Course,
	PriceHistoryInterval,
	PriceHistoryPoint,
} from '@/services/course.service';

/**
 * Cap on how many live ticks are appended to a cached interval series, so a
 * long-lived tab can never grow the cache without bound (#1115).
 */
const MAX_CACHED_POINTS: Record<PriceHistoryInterval, number> = {
	'1h': 120,
	'4h': 240,
	'24h': 288,
	'7d': 336,
};

export interface UseRealtimeKeyPriceResult {
	/** True while the WebSocket feed is connected for this key. */
	isLive: boolean;
	/** Raw connection lifecycle state, for diagnostics. */
	status: KeyPriceSocketStatus;
	/** ISO timestamp of the most recent applied tick, or null. */
	lastUpdatedAt: string | null;
}

/**
 * Subscribes a creator key to the real-time price feed (#1115).
 *
 * Every incoming tick is written straight into the React Query cache for the
 * active price-history interval and the creator detail record, so the bonding
 * curve chart and stat chips update in place — no refetch and no page reload.
 * When the socket is disabled or drops, the chart simply keeps showing the
 * last polled data.
 */
export function useRealtimeKeyPrice(
	keyId: string,
	interval: PriceHistoryInterval
): UseRealtimeKeyPriceResult {
	const queryClient = useQueryClient();
	const [status, setStatus] = useState<KeyPriceSocketStatus>(
		keyPriceSocket.currentStatus
	);
	const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

	useEffect(() => {
		return keyPriceSocket.subscribeStatus(setStatus);
	}, []);

	useEffect(() => {
		if (!keyId) return;

		const applyUpdate = (update: KeyPriceUpdate) => {
			setLastUpdatedAt(update.timestamp);
			const priceXlm = update.priceStroops / STROOPS_PER_XLM;

			queryClient.setQueryData<PriceHistoryPoint[]>(
				queryKeys.creators.priceHistory(keyId, interval),
				current => {
					if (!Array.isArray(current) || current.length === 0) return current;

					const lastPoint = current[current.length - 1];
					// Skip no-op ticks that repeat the newest cached point.
					if (
						lastPoint &&
						lastPoint.timestamp === update.timestamp &&
						lastPoint.price === priceXlm
					) {
						return current;
					}

					const appended = [
						...current.filter(
							point => point.timestamp !== update.timestamp
						),
						{ timestamp: update.timestamp, price: priceXlm },
					];
					const cap = MAX_CACHED_POINTS[interval];
					return appended.length > cap
						? appended.slice(appended.length - cap)
						: appended;
				}
			);

			// Keep the key-detail record (price + 24h change chips) in sync.
			queryClient.setQueryData<Course>(
				queryKeys.creators.detail(keyId),
				current => {
					if (!current) return current;
					return {
						...current,
						priceStroops: update.priceStroops,
						change24h: update.change24h ?? current.change24h,
					};
				}
			);
		};

		return keyPriceSocket.subscribe(keyId, applyUpdate);
	}, [keyId, interval, queryClient]);

	return {
		isLive: status === 'connected',
		status,
		lastUpdatedAt,
	};
}

export default useRealtimeKeyPrice;
