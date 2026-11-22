import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { courseService } from '@/services/course.service';
import {
	compareOracleToSpot,
	isOraclePriceStale,
	DEFAULT_ORACLE_DEVIATION_THRESHOLD_BPS,
	type OracleComparison,
	type OracleFreshness,
} from '@/utils/oraclePrice.utils';

export interface UseKeyOraclePriceOptions {
	/** Bonding-curve spot price in stroops, used to compute the deviation. */
	spotPriceStroops?: number | null;
	/** Warning threshold in basis points. Defaults to 1000 (10%). */
	thresholdBps?: number;
	/**
	 * Staleness window in milliseconds. Defaults to the feed's own
	 * `maxAgeSeconds` when reported, otherwise 5 minutes.
	 */
	staleAfterMs?: number;
}

/**
 * External oracle price for a key, compared against the bonding-curve spot
 * price (#967).
 *
 * Returns the resolved comparison (deviation, direction, threshold breach) and
 * the feed's freshness so the trading panel can render the price, the
 * deviation, and the warning/staleness indicators from a single hook. The
 * query is disabled until a `keyId` is available and does not retry — a
 * missing oracle feed is an expected state, not a transient failure.
 */
export function useKeyOraclePrice(
	keyId: string | undefined,
	options: UseKeyOraclePriceOptions = {}
) {
	const {
		spotPriceStroops,
		thresholdBps = DEFAULT_ORACLE_DEVIATION_THRESHOLD_BPS,
		staleAfterMs,
	} = options;

	const query = useQuery({
		queryKey: queryKeys.creators.oraclePrice(keyId ?? ''),
		queryFn: () => courseService.getKeyOraclePrice(keyId!),
		enabled: Boolean(keyId),
		staleTime: 30_000,
		retry: false,
	});

	const oraclePriceStroops = query.data?.priceStroops ?? null;

	const comparison: OracleComparison = compareOracleToSpot(
		{ oraclePriceStroops, spotPriceStroops },
		{ thresholdBps }
	);

	// An explicit window wins, then the feed's own max age, then the default.
	const feedMaxAgeMs =
		query.data?.maxAgeSeconds != null && query.data.maxAgeSeconds > 0
			? query.data.maxAgeSeconds * 1000
			: undefined;
	const resolvedStaleAfterMs = staleAfterMs ?? feedMaxAgeMs;

	const freshness: OracleFreshness = isOraclePriceStale(
		query.data?.updatedAt,
		resolvedStaleAfterMs != null ? { maxAgeMs: resolvedStaleAfterMs } : {}
	);

	return {
		...query,
		comparison,
		freshness,
		/** Feed identifier, shown in the tooltip explaining the source. */
		source: query.data?.source ?? null,
	};
}
