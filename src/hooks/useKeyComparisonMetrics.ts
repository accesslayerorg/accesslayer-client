import { useEffect, useRef, useState } from 'react';
import {
	keyMetricsService,
	type KeyMetrics,
} from '@/services/keyMetrics.service';

export type KeyMetricsEntry =
	| { status: 'loading' }
	| { status: 'error' }
	| { status: 'ready'; metrics: KeyMetrics };

export type FetchKeyMetrics = (creatorId: string) => Promise<KeyMetrics>;

/**
 * Loads metrics for each compared key independently, so one failing
 * creator doesn't blank the whole comparison table.
 */
export function useKeyComparisonMetrics(
	creatorIds: string[],
	fetchMetrics: FetchKeyMetrics = id => keyMetricsService.getKeyMetrics(id)
): Record<string, KeyMetricsEntry> {
	const [entries, setEntries] = useState<Record<string, KeyMetricsEntry>>({});
	const fetchRef = useRef(fetchMetrics);
	useEffect(() => {
		fetchRef.current = fetchMetrics;
	});

	const idsKey = creatorIds.join(',');

	useEffect(() => {
		let cancelled = false;
		const ids = idsKey ? idsKey.split(',') : [];

		setEntries(current => {
			const next: Record<string, KeyMetricsEntry> = {};
			for (const id of ids) next[id] = current[id] ?? { status: 'loading' };
			return next;
		});

		for (const id of ids) {
			fetchRef
				.current(id)
				.then(metrics => {
					if (cancelled) return;
					// Treat an empty payload like a failure so the table falls
					// back to card data instead of rendering blanks as "ready".
					if (!metrics) throw new Error('Missing key metrics');
					setEntries(current =>
						id in current
							? { ...current, [id]: { status: 'ready', metrics } }
							: current
					);
				})
				.catch(() => {
					if (cancelled) return;
					setEntries(current =>
						id in current
							? { ...current, [id]: { status: 'error' } }
							: current
					);
				});
		}

		return () => {
			cancelled = true;
		};
	}, [idsKey]);

	return entries;
}
