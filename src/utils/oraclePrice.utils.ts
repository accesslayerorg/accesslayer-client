import { isStale } from '@/utils/staleData.utils';

/**
 * Oracle price comparison for the key trading panel (#967).
 *
 * The bonding curve produces a *spot* price that moves with supply, while an
 * external oracle publishes an independent reference price. Showing both lets a
 * trader see when the curve has drifted away from the wider market. When the
 * two diverge by more than a configurable threshold the panel raises a warning,
 * and when the oracle feed has not published recently the price is flagged as
 * stale so a stale reference is never read as a live one.
 *
 * All prices are in stroops (1 XLM = 10,000,000 stroops).
 */

export interface OraclePriceInput {
	/** Oracle reference price in stroops. */
	oraclePriceStroops?: number | null;
	/** Bonding-curve spot price in stroops. */
	spotPriceStroops?: number | null;
	/** ISO timestamp (or epoch ms) the oracle last published. */
	updatedAt?: string | number | null;
}

/** Direction of the oracle price relative to the spot price. */
export type OracleDeviationDirection = 'above' | 'below' | 'aligned';

/** Default warning threshold: 10% divergence between oracle and spot price. */
export const DEFAULT_ORACLE_DEVIATION_THRESHOLD_BPS = 1_000;

/** Default staleness window: 5 minutes without a publish. */
export const DEFAULT_ORACLE_STALE_AFTER_MS = 5 * 60 * 1000;

export interface OracleComparison {
	/** Oracle price in stroops, when known. */
	oraclePriceStroops: number | null;
	/** Bonding-curve spot price in stroops, when known. */
	spotPriceStroops: number | null;
	/** Absolute difference between the two prices, in stroops. */
	deviationStroops: number | null;
	/** Absolute deviation as a percentage of the spot price. */
	deviationPercent: number | null;
	/** Whether the deviation exceeds the configured threshold. */
	exceedsThreshold: boolean;
	/** Whether the oracle sits above (or below) the spot price. */
	direction: OracleDeviationDirection;
	/** Whether both prices are known, so a comparison can be shown at all. */
	hasComparison: boolean;
}

export interface OracleComparisonOptions {
	/** Warning threshold in basis points. Defaults to 1000 (10%). */
	thresholdBps?: number;
}

export interface OracleFreshness {
	/** `true` when the feed is older than the staleness window. */
	isStale: boolean;
	/** Age of the feed in milliseconds. */
	ageMs: number;
	/** Staleness window that was applied, in milliseconds. */
	maxAgeMs: number;
}

export interface OracleFreshnessOptions {
	/** Staleness window in milliseconds. Defaults to 5 minutes. */
	maxAgeMs?: number;
	/** Reference "now" for the age calculation. Defaults to `Date.now()`. */
	now?: number;
}

function toFiniteNumber(value: number | null | undefined): number | null {
	return value != null && Number.isFinite(value) ? value : null;
}

function toTimestampMs(
	value: string | number | null | undefined
): number | null {
	if (value == null) return null;
	if (typeof value === 'number') {
		return Number.isFinite(value) ? value : null;
	}
	const parsed = new Date(value).getTime();
	return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Compares the oracle price against the bonding-curve spot price.
 *
 * The deviation is expressed as a percentage of the spot price so it is
 * independent of the absolute price level. A missing or zero spot price makes
 * the percentage undefined (the comparison is still shown, but without a
 * deviation figure) rather than rendering `Infinity`.
 */
export function compareOracleToSpot(
	input: OraclePriceInput,
	options: OracleComparisonOptions = {}
): OracleComparison {
	const {
		thresholdBps = DEFAULT_ORACLE_DEVIATION_THRESHOLD_BPS,
	} = options;

	const oraclePriceStroops = toFiniteNumber(input.oraclePriceStroops);
	const spotPriceStroops = toFiniteNumber(input.spotPriceStroops);
	const hasComparison = oraclePriceStroops != null && spotPriceStroops != null;

	if (!hasComparison) {
		return {
			oraclePriceStroops,
			spotPriceStroops,
			deviationStroops: null,
			deviationPercent: null,
			exceedsThreshold: false,
			direction: 'aligned',
			hasComparison: false,
		};
	}

	const deviationStroops = Math.abs(oraclePriceStroops - spotPriceStroops);
	const deviationPercent =
		spotPriceStroops > 0 ? (deviationStroops / spotPriceStroops) * 100 : null;

	const direction: OracleDeviationDirection =
		oraclePriceStroops > spotPriceStroops
			? 'above'
			: oraclePriceStroops < spotPriceStroops
				? 'below'
				: 'aligned';

	return {
		oraclePriceStroops,
		spotPriceStroops,
		deviationStroops,
		deviationPercent,
		exceedsThreshold:
			deviationPercent != null &&
			deviationPercent * 100 >= Math.abs(thresholdBps),
		direction,
		hasComparison: true,
	};
}

/**
 * Whether the oracle feed is older than its staleness window.
 *
 * A feed with no `updatedAt` is treated as stale — an undated price cannot be
 * trusted as current. Reuses {@link isStale} from the shared stale-data helper
 * so the threshold semantics match the rest of the client.
 */
export function isOraclePriceStale(
	updatedAt: string | number | null | undefined,
	options: OracleFreshnessOptions = {}
): OracleFreshness {
	const {
		maxAgeMs = DEFAULT_ORACLE_STALE_AFTER_MS,
		now = Date.now(),
	} = options;
	const timestamp = toTimestampMs(updatedAt);
	const { stale, ageMs } = isStale(timestamp, maxAgeMs, { now });

	return { isStale: stale, ageMs, maxAgeMs };
}
