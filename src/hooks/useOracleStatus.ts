import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { oracleService } from '@/services/oracle.service';
import type {
	OracleHealthState,
	OracleSource,
	OracleStatus,
} from '@/types/oracle';
import { formatLiveRelativeTime } from '@/utils/oracleRelativeTime.utils';

export interface UseOracleStatusResult {
	/** Underlying contract status data. */
	data: OracleStatus | undefined;
	/** Contract reported status: 'healthy' | 'fallback' | 'stale'. */
	status: OracleHealthState;
	/** Price source: 'primary' | 'fallback'. */
	source: OracleSource;
	/** Human-readable source name. */
	sourceName: string;
	/** Reference price in XLM. */
	priceXlm: number;
	/** Reference price in stroops. */
	priceStroops: number;
	/** Epoch timestamp in ms of last oracle report. */
	updatedAt: number;
	/** Current age in milliseconds (live updated). */
	ageMs: number;
	/** Live formatted relative time string (e.g. '12s ago', 'just now'). */
	relativeTime: string;
	/** Absolute deviation percentage from spot/reference. */
	deviationPercent: number;
	/** Deviation in basis points. */
	deviationBps: number;
	/** Whether the price is stale. */
	isStale: boolean;
	/** Whether the source is fallback. */
	isFallback: boolean;
	/** Whether the oracle is healthy. */
	isHealthy: boolean;
	/** Explanation reason when actions are blocked or degraded. */
	staleReason: string | null;
	/** Loading state. */
	isLoading: boolean;
	/** Error state. */
	error: Error | null;
}

export function useOracleStatus(
	asset: string = 'XLM',
	options?: { enabled?: boolean; pollIntervalMs?: number }
): UseOracleStatusResult {
	const enabled = options?.enabled ?? Boolean(asset);
	const pollIntervalMs = options?.pollIntervalMs ?? 15_000;

	const {
		data,
		isLoading,
		error,
	} = useQuery({
		queryKey: queryKeys.oracle.status(asset),
		queryFn: () => oracleService.getOracleStatus(asset),
		enabled,
		refetchInterval: pollIntervalMs,
	});

	// Live relative time ticking every second so age updates without page reload
	const [currentTime, setCurrentTime] = useState<number>(Date.now());

	useEffect(() => {
		const interval = setInterval(() => {
			setCurrentTime(Date.now());
		}, 1000);
		return () => clearInterval(interval);
	}, []);

	const updatedAt = data?.updatedAt ?? currentTime;
	const ageMs = Math.max(0, currentTime - updatedAt);
	const relativeTime = formatLiveRelativeTime(ageMs);

	const isStale =
		Boolean(data?.isStale) ||
		(data?.maxStaleAgeMs ? ageMs > data.maxStaleAgeMs : false) ||
		data?.status === 'stale';

	const isFallback =
		!isStale && (data?.isFallback || data?.source === 'fallback' || data?.status === 'fallback');

	const effectiveStatus: OracleHealthState = isStale
		? 'stale'
		: isFallback
			? 'fallback'
			: 'healthy';

	const staleReason = isStale
		? `Oracle price is stale (last update ${relativeTime}). Dependent actions are temporarily paused to protect against price manipulation.`
		: null;

	return {
		data,
		status: effectiveStatus,
		source: isFallback ? 'fallback' : 'primary',
		sourceName: data?.sourceName ?? (isFallback ? 'Fallback Oracle' : 'Primary Oracle'),
		priceXlm: data?.priceXlm ?? 0,
		priceStroops: data?.priceStroops ?? 0,
		updatedAt,
		ageMs,
		relativeTime,
		deviationPercent: data?.deviationPercent ?? 0,
		deviationBps: data?.deviationBps ?? 0,
		isStale,
		isFallback,
		isHealthy: effectiveStatus === 'healthy',
		staleReason,
		isLoading,
		error: (error as Error) || null,
	};
}
