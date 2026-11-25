import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
	keySnapshotHistoryService,
	type KeySnapshot,
	type SnapshotHistoryRange,
} from '@/services/keySnapshotHistory.service';
import { SNAPSHOT_HISTORY_STALE_TIME_MS } from '@/hooks/useKeySnapshotHistory';
import {
	MIN_HISTORY_DAYS,
	buildCorrelationMatrix,
	dailyReturns,
	diversificationScore,
	highlyCorrelatedPairs,
	normaliseWeights,
	type CorrelatedPair,
	type CorrelationMatrix,
	type DiversificationScore,
	type ReturnSeries,
} from '@/utils/portfolioCorrelation.utils';

/** One held key, valued at its current price. */
export interface CorrelationPosition {
	keyId: string;
	name: string;
	/** Position value in stroops (quantity × current price); 0 or null when unknown. */
	valueStroops: number | null;
}

export interface ExcludedKey {
	keyId: string;
	name: string;
	days: number;
}

export interface PortfolioCorrelationResult {
	isLoading: boolean;
	isError: boolean;
	/** Keys included in the analysis, in matrix order. */
	keys: CorrelationPosition[];
	matrix: CorrelationMatrix;
	/** Pairs above the 0.8 threshold, strongest first. */
	highPairs: CorrelatedPair[];
	/** Keys left out because they have fewer than 14 days of history. */
	excluded: ExcludedKey[];
	/** Weights of the included keys, summing to 1. */
	weights: Map<string, number>;
	diversification: DiversificationScore;
}

/**
 * Correlation of daily returns between the wallet's held keys, and a
 * diversification score over them (#1474).
 *
 * Fetches each key's daily snapshots for `range` in parallel, drops keys with
 * fewer than MIN_HISTORY_DAYS days of history, and weights the rest by their
 * current position value.
 */
export function usePortfolioCorrelation(
	range: SnapshotHistoryRange,
	positions: readonly CorrelationPosition[]
): PortfolioCorrelationResult {
	const held = useMemo(
		() => positions.filter(p => (p.valueStroops ?? 0) > 0),
		[positions]
	);

	const queries = useQueries({
		queries: held.map(p => ({
			queryKey: queryKeys.creators.snapshotHistory(p.keyId, range),
			queryFn: () =>
				keySnapshotHistoryService.getSnapshotHistory(p.keyId, range),
			staleTime: SNAPSHOT_HISTORY_STALE_TIME_MS,
			retry: false,
		})),
	});

	const isLoading = queries.some(q => q.isLoading);
	const isError = queries.length > 0 && queries.every(q => q.isError);
	const dataKey = queries.map(q => q.dataUpdatedAt).join(',');

	return useMemo(() => {
		const series = new Map<string, ReturnSeries>();
		const keys: CorrelationPosition[] = [];
		const excluded: ExcludedKey[] = [];
		held.forEach((p, i) => {
			const snapshots: KeySnapshot[] = queries[i]?.data ?? [];
			const s = dailyReturns(snapshots);
			if (s.days < MIN_HISTORY_DAYS) {
				if (!queries[i]?.isLoading)
					excluded.push({ keyId: p.keyId, name: p.name, days: s.days });
				return;
			}
			series.set(p.keyId, s);
			keys.push(p);
		});
		const matrix = buildCorrelationMatrix(
			series,
			keys.map(k => k.keyId)
		);
		const weights = normaliseWeights(
			new Map(keys.map(k => [k.keyId, k.valueStroops ?? 0]))
		);
		return {
			isLoading,
			isError,
			keys,
			matrix,
			highPairs: highlyCorrelatedPairs(matrix),
			excluded,
			weights,
			diversification: diversificationScore(weights, matrix),
		};
		// `queries` is a new array every render; dataKey tracks its contents.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [held, dataKey, isLoading, isError]);
}
