/**
 * Launch penalty utilities for the sell confirmation flow (#825).
 *
 * Holders who sell within 7 days of a key's creation incur an early-sell
 * penalty (configured per-creator via `LaunchPenaltyPanel` / the
 * `set_launch_penalty` contract call, see `launchPenaltyBps` on `Course`).
 * These helpers determine whether that launch window is still open and
 * compute the resulting penalty against a sell's gross proceeds.
 */

/** Stellar's approximate ledger close time, in milliseconds. */
const STELLAR_LEDGER_TIME_MS = 5000;

/** Length of the early-sell launch window, in milliseconds (7 days). */
export const LAUNCH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/** Length of the early-sell launch window, expressed in ledgers. */
export const LAUNCH_WINDOW_LEDGERS = Math.round(
	LAUNCH_WINDOW_MS / STELLAR_LEDGER_TIME_MS
);

/**
 * Determines whether a sell at `currentLedger` falls within the 7-day
 * launch window that started at `createdAtLedger`.
 *
 * Returns `false` (no penalty) whenever either ledger is missing/invalid,
 * or when `currentLedger` is at or before `createdAtLedger` (clock skew /
 * stale data) so a malformed pair never accidentally blocks a sell.
 */
export function isWithinLaunchWindow(
	createdAtLedger: number | null | undefined,
	currentLedger: number | null | undefined
): boolean {
	if (
		createdAtLedger == null ||
		currentLedger == null ||
		!Number.isFinite(createdAtLedger) ||
		!Number.isFinite(currentLedger)
	) {
		return false;
	}

	const ledgersSinceCreation = currentLedger - createdAtLedger;
	return (
		ledgersSinceCreation >= 0 && ledgersSinceCreation < LAUNCH_WINDOW_LEDGERS
	);
}

export interface LaunchPenaltyBreakdown {
	/** Whether the launch penalty applies to this sell. */
	applies: boolean;
	/** Penalty rate in basis points actually applied (0 when it doesn't apply). */
	penaltyBps: number;
	/** Penalty amount deducted from gross proceeds, in stroops. */
	penaltyStroops: number;
	/** Proceeds remaining after the penalty is deducted, in stroops. */
	netProceedsStroops: number;
}

/**
 * Computes the launch-penalty breakdown for a sell.
 *
 * When the key is past its 7-day launch window, or has no penalty
 * configured, `applies` is `false` and `netProceedsStroops` simply mirrors
 * `grossProceedsStroops` (falling back to `0` when the gross amount isn't
 * available).
 */
export function calculateLaunchPenalty(
	grossProceedsStroops: number | null | undefined,
	createdAtLedger: number | null | undefined,
	currentLedger: number | null | undefined,
	launchPenaltyBps: number | null | undefined
): LaunchPenaltyBreakdown {
	const gross =
		grossProceedsStroops != null && Number.isFinite(grossProceedsStroops)
			? grossProceedsStroops
			: 0;

	const withinWindow = isWithinLaunchWindow(createdAtLedger, currentLedger);
	const bps =
		launchPenaltyBps != null && Number.isFinite(launchPenaltyBps)
			? launchPenaltyBps
			: 0;

	const applies = withinWindow && bps > 0 && gross > 0;

	if (!applies) {
		return {
			applies: false,
			penaltyBps: 0,
			penaltyStroops: 0,
			netProceedsStroops: gross,
		};
	}

	const penaltyStroops = Math.round((gross * bps) / 10_000);
	const netProceedsStroops = gross - penaltyStroops;

	return {
		applies: true,
		penaltyBps: bps,
		penaltyStroops,
		netProceedsStroops,
	};
}
