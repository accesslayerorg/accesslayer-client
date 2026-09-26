/**
 * Buy cooldown configuration helpers for the creator dashboard (#889).
 *
 * The on-chain `set_buy_cooldown` value is stored in Stellar ledgers
 * (~5 seconds per ledger). Creators think in minutes, so the panel converts
 * the stored value to minutes for display and converts the submitted minutes
 * back to ledgers before the contract call.
 */

/** Ledgers in one minute: 60s / ~5s-per-ledger. */
export const LEDGERS_PER_MINUTE = 12;

export const MIN_BUY_COOLDOWN_MINUTES = 0;
export const MAX_BUY_COOLDOWN_MINUTES = 60;

/** Approximate seconds elapsed per ledger on the Stellar network. */
export const SECONDS_PER_LEDGER = 5;

function normalizeOrZero(value: number | null | undefined): number {
	if (value == null || !Number.isFinite(value) || value < 0) return 0;
	return value;
}

/** Round the stored ledger value up to the nearest whole ledger. */
function roundLedgersToMinutes(ledgers: number | null | undefined): number {
	return Math.round(normalizeOrZero(ledgers) / LEDGERS_PER_MINUTE);
}

/**
 * Converts the on-chain cooldown (in ledgers) to whole minutes for display.
 * `undefined`/`null`/non-positive values convert to 0 minutes.
 */
export function ledgersToMinutes(ledgers: number | null | undefined): number {
	return roundLedgersToMinutes(ledgers);
}

/**
 * Converts a minute value into the number of on-chain ledgers to submit,
 * assuming ~5 seconds per ledger (1 ledger per ~5 seconds ⇒ 12 per minute).
 */
export function minutesToLedgers(minutes: number): number {
	return Math.round(normalizeOrZero(minutes) * LEDGERS_PER_MINUTE);
}

export interface BuyCooldownInputValidation {
	error: string | null;
	isValid: boolean;
}

/**
 * Validates the raw minutes input. Must be a whole number within
 * 0–60 (0 = no cooldown).
 */
export function validateBuyCooldownInput(rawMinutes: string): BuyCooldownInputValidation {
	const trimmed = rawMinutes.trim();
	const parsed = Number(trimmed);

	const error =
		trimmed === ''
			? 'Enter a cooldown in minutes'
			: !Number.isFinite(parsed)
				? 'Enter a valid number'
				: !Number.isInteger(parsed)
					? 'Enter a whole number of minutes'
					: parsed < MIN_BUY_COOLDOWN_MINUTES
						? 'Minimum is 0 minutes'
						: parsed > MAX_BUY_COOLDOWN_MINUTES
							? 'Maximum is 60 minutes'
							: null;

	return { error, isValid: error === null };
}