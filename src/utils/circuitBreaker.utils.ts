import { formatPriceImpact } from '@/utils/priceImpact.utils';

/**
 * Default circuit breaker threshold in percent if unspecified on the creator key (#1034).
 * A trade with price impact >= 15% will trip the circuit breaker.
 */
export const DEFAULT_CIRCUIT_BREAKER_THRESHOLD_PERCENT = 15;

/**
 * Ratio of the circuit breaker threshold at which the indicator enters
 * the 'approaching' warning state (default 80%, e.g., 12% for a 15% limit).
 */
export const DEFAULT_CIRCUIT_BREAKER_PROXIMITY_RATIO = 0.8;

/** Circuit breaker status level. */
export type CircuitBreakerLevel = 'normal' | 'approaching' | 'breached';

export interface CircuitBreakerStatus {
	/** Current status level of the circuit breaker. */
	level: CircuitBreakerLevel;
	/** Current computed price impact in percent (e.g. 5.2 for +5.20%). */
	impactPercent: number;
	/** Configured or default threshold percentage that trips the breaker (e.g. 15 for 15%). */
	thresholdPercent: number;
	/** Proximity threshold percentage at which the warning banner triggers (e.g. 12 for 12%). */
	approachingThresholdPercent: number;
	/** Whether the price impact equals or exceeds the circuit breaker limit. */
	isBreached: boolean;
	/** Whether the price impact has entered the approaching proximity zone. */
	isApproaching: boolean;
	/** Descriptive status message explaining the current circuit breaker state. */
	message: string;
}

export interface EvaluateCircuitBreakerOptions {
	/** Current price impact percentage. */
	impactPercent?: number | null;
	/** Key-configured threshold in percent (takes precedence over bps). */
	thresholdPercent?: number | null;
	/** Key-configured threshold in basis points (e.g. 1500 = 15%). */
	thresholdBps?: number | null;
	/**
	 * Fraction of the threshold at which the approaching warning activates (default 0.8 = 80%).
	 * Must be > 0 and < 1.
	 */
	proximityRatio?: number;
}

/** Standard explanation for circuit breaker protection tooltip. */
export const CIRCUIT_BREAKER_TOOLTIP_EXPLANATION =
	'Circuit breaker protection automatically prevents orders that would cause excessive price movement on the bonding curve, protecting buyers from extreme slippage and manipulated prices.';

/**
 * Resolves the effective circuit breaker threshold in percent from key settings,
 * falling back to DEFAULT_CIRCUIT_BREAKER_THRESHOLD_PERCENT.
 */
export function resolveCircuitBreakerThreshold(options?: {
	thresholdPercent?: number | null;
	thresholdBps?: number | null;
}): number {
	if (
		options?.thresholdPercent != null &&
		Number.isFinite(options.thresholdPercent) &&
		options.thresholdPercent > 0
	) {
		return options.thresholdPercent;
	}

	if (
		options?.thresholdBps != null &&
		Number.isFinite(options.thresholdBps) &&
		options.thresholdBps > 0
	) {
		return options.thresholdBps / 100;
	}

	return DEFAULT_CIRCUIT_BREAKER_THRESHOLD_PERCENT;
}

/**
 * Evaluates whether an order's price impact approaches or exceeds the key's
 * configured circuit breaker limit (#1034).
 */
export function evaluateCircuitBreakerStatus({
	impactPercent,
	thresholdPercent,
	thresholdBps,
	proximityRatio = DEFAULT_CIRCUIT_BREAKER_PROXIMITY_RATIO,
}: EvaluateCircuitBreakerOptions): CircuitBreakerStatus {
	const sanitizedImpact =
		impactPercent != null && Number.isFinite(impactPercent)
			? Math.max(0, impactPercent)
			: 0;

	const effectiveThreshold = resolveCircuitBreakerThreshold({
		thresholdPercent,
		thresholdBps,
	});

	const validRatio =
		Number.isFinite(proximityRatio) && proximityRatio > 0 && proximityRatio < 1
			? proximityRatio
			: DEFAULT_CIRCUIT_BREAKER_PROXIMITY_RATIO;

	const approachingThreshold = effectiveThreshold * validRatio;

	const isBreached = sanitizedImpact >= effectiveThreshold;
	const isApproaching = !isBreached && sanitizedImpact >= approachingThreshold;

	let level: CircuitBreakerLevel = 'normal';
	let message = 'Price impact is within safe limits.';

	if (isBreached) {
		level = 'breached';
		message = `Circuit breaker triggered: Price impact of ${formatPriceImpact(
			sanitizedImpact
		)} equals or exceeds the maximum limit of ${effectiveThreshold}%. Order execution is blocked to protect against extreme price distortion.`;
	} else if (isApproaching) {
		level = 'approaching';
		message = `Caution: Price impact (${formatPriceImpact(
			sanitizedImpact
		)}) is approaching the key's circuit breaker limit (${effectiveThreshold}%). Orders exceeding this threshold will be blocked.`;
	}

	return {
		level,
		impactPercent: sanitizedImpact,
		thresholdPercent: effectiveThreshold,
		approachingThresholdPercent: approachingThreshold,
		isBreached,
		isApproaching,
		message,
	};
}
