/**
 * Holding-cap helpers for the buy panel (#961).
 *
 * A creator key can define a maximum number of keys a single wallet may
 * hold (`Course.maxHoldingCap`). These helpers compute how much of that
 * cap the connected wallet has used and clamp buy quantities so a purchase
 * can never push the wallet past the cap.
 */

/** Percentage of the cap at which the buy panel starts warning. */
export const HOLDING_CAP_WARNING_THRESHOLD_PERCENT = 80;

/** Percentage of the cap at which buying is blocked entirely. */
export const HOLDING_CAP_REACHED_PERCENT = 100;

export type HoldingCapStatus = 'no-cap' | 'ok' | 'warning' | 'reached';

export interface HoldingCapState {
	/** The configured cap, or null when the key has no holding cap. */
	maxCap: number | null;
	/** Keys currently held by the wallet. */
	holding: number;
	/** Percent of the cap used (0-100), or null when there is no cap. */
	percentUsed: number | null;
	/** Keys the wallet can still buy, or null when there is no cap. */
	remaining: number | null;
	status: HoldingCapStatus;
}

/**
 * Compute the wallet's position relative to the key's holding cap.
 *
 * @param holding Keys currently held by the wallet (defaults to 0).
 * @param maxCap Maximum keys one wallet may hold; null/undefined/0 means no cap.
 */
export function computeHoldingCapState(
	holding: number,
	maxCap: number | null | undefined
): HoldingCapState {
	const safeHolding = Math.max(0, holding);

	if (maxCap == null || maxCap <= 0) {
		return {
			maxCap: null,
			holding: safeHolding,
			percentUsed: null,
			remaining: null,
			status: 'no-cap',
		};
	}

	const percentUsed = Math.min(
		HOLDING_CAP_REACHED_PERCENT,
		(safeHolding / maxCap) * 100
	);
	const remaining = Math.max(0, maxCap - safeHolding);

	let status: HoldingCapStatus = 'ok';
	if (remaining <= 0) {
		status = 'reached';
	} else if (percentUsed >= HOLDING_CAP_WARNING_THRESHOLD_PERCENT) {
		status = 'warning';
	}

	return { maxCap, holding: safeHolding, percentUsed, remaining, status };
}

/**
 * Clamp a buy quantity so it can never exceed the wallet's remaining
 * capacity under the holding cap (or the per-transaction maximum).
 *
 * @param input Quantity the user entered.
 * @param remaining Remaining capacity under the holding cap, or null when
 *   the key has no cap.
 * @param maxPerTx Per-transaction maximum, or null when there is none.
 */
export function clampBuyQuantityToCapacity(
	input: number | string,
	remaining: number | null,
	maxPerTx: number | null
): number {
	const parsed = typeof input === 'number' ? input : parseFloat(input);
	if (!Number.isFinite(parsed)) return 0;

	const rounded = Math.max(0, Math.round(parsed));

	let ceiling = Number.POSITIVE_INFINITY;
	if (remaining != null) ceiling = Math.min(ceiling, remaining);
	if (maxPerTx != null) ceiling = Math.min(ceiling, maxPerTx);

	return Math.min(rounded, ceiling);
}
