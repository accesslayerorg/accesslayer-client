import { STROOPS_PER_XLM } from '@/constants/stellar';
import { formatXlm } from '@/hooks/useFormatXlm';

/**
 * Pure helpers for liquidity-provider (LP) positions (#1030).
 *
 * Every amount here is an integer number of stroops held as a `bigint`. The
 * LP reward contract (accesslayer-contracts #1002) stores contributions and
 * rewards as `i128`, so routing them through `number` would silently lose
 * precision above 2^53 stroops. Nothing in this file uses floating point for
 * money.
 */

/** XLM (the only asset the LP pools are denominated in) has 7 decimals. */
export const LP_ASSET_DECIMALS = 7;
const STROOPS_PER_XLM_BIG = BigInt(STROOPS_PER_XLM);

/** The contract rejects `amount <= 0`; one stroop is the smallest deposit. */
export const MIN_LP_DEPOSIT_STROOPS = 1n;

/** Basis-point scale used by the contract (`BPS_SCALE = 10_000`). */
const BPS_SCALE = 10_000n;

// ---------------------------------------------------------------------------
// Parsing API values
// ---------------------------------------------------------------------------

/**
 * Parses a non-negative integer stroop amount from an API value.
 *
 * Accepts a `bigint`, a base-10 integer string (how i128 values are usually
 * serialised), or a safe-integer `number`. Anything else (fractions, negative
 * values, unsafe integers, garbage) returns `null` so callers can render an
 * "unavailable" state instead of a wrong number.
 */
export function parseStroops(value: unknown): bigint | null {
	if (typeof value === 'bigint') return value >= 0n ? value : null;
	if (typeof value === 'number') {
		return Number.isSafeInteger(value) && value >= 0 ? BigInt(value) : null;
	}
	if (typeof value === 'string') {
		const trimmed = value.trim();
		return /^\d+$/.test(trimmed) ? BigInt(trimmed) : null;
	}
	return null;
}

/**
 * Lock information for a single position.
 *
 * - `none`: the API reports no lock (the contract in #1002 has no lock, so
 *   this is the default when the field is absent or null).
 * - `until`: removal is blocked until `unlocksAtMs`.
 * - `invalid`: the API sent a lock value we can't interpret. We fail closed
 *   and block removal rather than guess.
 */
export type LpLockInfo =
	| { kind: 'none' }
	| { kind: 'until'; unlocksAtMs: number }
	| { kind: 'invalid' };

/**
 * Interprets an API lock timestamp. Numbers above 1e11 are epoch
 * milliseconds, smaller ones epoch seconds (same heuristic as
 * `lockupCountdown.utils`). Strings may be numeric or ISO-8601.
 */
export function parseLpLock(value: unknown): LpLockInfo {
	if (value === undefined || value === null || value === '') {
		return { kind: 'none' };
	}

	let ms: number | null = null;
	if (typeof value === 'number') {
		ms = value > 1e11 ? value : value * 1000;
	} else if (typeof value === 'string') {
		const trimmed = value.trim();
		if (/^\d+$/.test(trimmed)) {
			const numeric = Number(trimmed);
			ms = numeric > 1e11 ? numeric : numeric * 1000;
		} else {
			ms = Date.parse(trimmed);
		}
	}

	if (ms === null || !Number.isFinite(ms) || ms <= 0) {
		return { kind: 'invalid' };
	}
	return { kind: 'until', unlocksAtMs: ms };
}

// ---------------------------------------------------------------------------
// Lock state
// ---------------------------------------------------------------------------

export type LpLockStatus = 'none' | 'locked' | 'unlocked' | 'invalid';

export interface LpLockState {
	status: LpLockStatus;
	/** Whole seconds until unlock, rounded up. 0 unless `status === 'locked'`. */
	remainingSeconds: number;
	/** Whether the UI should offer removal. The contract still has the final say. */
	canRemove: boolean;
}

/** Resolves a position's lock against the supplied clock. */
export function resolveLpLockState(
	lock: LpLockInfo,
	nowMs: number
): LpLockState {
	if (lock.kind === 'none') {
		return { status: 'none', remainingSeconds: 0, canRemove: true };
	}
	if (lock.kind === 'invalid') {
		return { status: 'invalid', remainingSeconds: 0, canRemove: false };
	}
	const remainingMs = lock.unlocksAtMs - nowMs;
	if (remainingMs <= 0) {
		return { status: 'unlocked', remainingSeconds: 0, canRemove: true };
	}
	return {
		status: 'locked',
		remainingSeconds: Math.ceil(remainingMs / 1000),
		canRemove: false,
	};
}

/**
 * Formats a lock countdown: `2d 14h 32m` for a day or more, `14h 32m 5s`
 * under a day, `32m 5s` under an hour, `5s` under a minute.
 */
export function formatLockCountdown(totalSeconds: number): string {
	if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return '0s';
	const seconds = Math.ceil(totalSeconds);
	const days = Math.floor(seconds / 86_400);
	const hours = Math.floor((seconds % 86_400) / 3_600);
	const minutes = Math.floor((seconds % 3_600) / 60);
	const secs = seconds % 60;

	if (days > 0) return `${days}d ${hours}h ${minutes}m`;
	if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
	if (minutes > 0) return `${minutes}m ${secs}s`;
	return `${secs}s`;
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/**
 * Formats stroops as XLM at full 7-decimal precision (e.g. `12.5000000 XLM`)
 * via the existing bigint-safe `formatXlm`. Full precision is deliberate: a
 * 3-stroop reward must not render as `0.00 XLM`.
 */
export function formatLpAmount(stroops: bigint | null | undefined): string {
	if (stroops == null) return '—';
	return `${formatXlm(stroops, { decimals: LP_ASSET_DECIMALS })} XLM`;
}

/**
 * Pool share as a display string, computed from exact integers.
 *
 * Preference order:
 * 1. `contribution / poolTotal` when the pool total is known. This is the
 *    same ratio the contract uses in `get_lp_position`, at higher precision
 *    than its truncated basis points.
 * 2. The contract-reported `shareBps` when the pool total is unavailable.
 *
 * The value is floored to 2 decimals, never rounded up, so a 99.996% share
 * reads `99.99%` rather than a misleading `100.00%`. A non-zero share smaller
 * than 0.01% reads `<0.01%` instead of `0.00%`.
 */
export function formatPoolShare({
	contributionStroops,
	poolTotalLiquidityStroops,
	shareBps,
}: {
	contributionStroops: bigint;
	poolTotalLiquidityStroops: bigint | null;
	shareBps: number | null;
}): string {
	if (contributionStroops <= 0n) return '0%';

	let hundredthsOfPercent: bigint;
	if (poolTotalLiquidityStroops != null && poolTotalLiquidityStroops > 0n) {
		if (contributionStroops >= poolTotalLiquidityStroops) return '100%';
		hundredthsOfPercent =
			(contributionStroops * BPS_SCALE) / poolTotalLiquidityStroops;
	} else if (
		shareBps != null &&
		Number.isSafeInteger(shareBps) &&
		shareBps >= 0
	) {
		if (shareBps >= 10_000) return '100%';
		hundredthsOfPercent = BigInt(shareBps);
	} else {
		return '—';
	}

	if (hundredthsOfPercent === 0n) return '<0.01%';
	const whole = hundredthsOfPercent / 100n;
	const fraction = (hundredthsOfPercent % 100n).toString().padStart(2, '0');
	return `${whole}.${fraction}%`;
}

/**
 * Pool share a deposit of `amountStroops` would receive, using the contract's
 * own formula from `add_liquidity`: `amount / (total_liquidity + amount)`.
 */
export function formatProjectedPoolShare(
	amountStroops: bigint,
	poolTotalLiquidityStroops: bigint | null
): string {
	if (poolTotalLiquidityStroops == null) return '—';
	return formatPoolShare({
		contributionStroops: amountStroops,
		poolTotalLiquidityStroops: poolTotalLiquidityStroops + amountStroops,
		shareBps: null,
	});
}

// ---------------------------------------------------------------------------
// Amount input validation
// ---------------------------------------------------------------------------

export type LpAmountValidationReason =
	| 'required'
	| 'invalid'
	| 'precision'
	| 'non_positive'
	| 'below_minimum'
	| 'balance_unavailable'
	| 'exceeds_balance';

export type LpAmountValidation =
	| { ok: true; stroops: bigint }
	| { ok: false; reason: LpAmountValidationReason; message: string };

const AMOUNT_PATTERN = /^(\d+)(?:\.(\d*))?$|^\.(\d+)$/;

/**
 * Converts a user-typed XLM amount to stroops without floating point.
 * Returns `null` for anything that isn't a plain decimal number, and
 * `'precision'` when it has more than 7 decimal places.
 */
export function parseXlmInputToStroops(
	input: string
): bigint | null | 'precision' {
	const match = AMOUNT_PATTERN.exec(input.trim());
	if (!match) return null;
	const whole = match[1] ?? '0';
	const fraction = match[2] ?? match[3] ?? '';
	if (fraction.length > LP_ASSET_DECIMALS) return 'precision';
	return (
		BigInt(whole) * STROOPS_PER_XLM_BIG +
		BigInt(fraction.padEnd(LP_ASSET_DECIMALS, '0') || '0')
	);
}

/** Formats stroops as a plain input string, e.g. `12.5` (no grouping, trimmed). */
export function stroopsToXlmInput(stroops: bigint): string {
	const whole = stroops / STROOPS_PER_XLM_BIG;
	const fraction = (stroops % STROOPS_PER_XLM_BIG)
		.toString()
		.padStart(LP_ASSET_DECIMALS, '0')
		.replace(/0+$/, '');
	return fraction ? `${whole}.${fraction}` : whole.toString();
}

/**
 * Validates an add-liquidity amount against the wallet's spendable balance.
 *
 * `availableStroops === null` means the balance couldn't be read; we refuse
 * to validate (and therefore to submit) rather than let the user sign a
 * transaction we can't sanity-check. The contract remains authoritative.
 */
export function validateLpAmountInput(
	input: string,
	{
		availableStroops,
		minimumStroops = MIN_LP_DEPOSIT_STROOPS,
	}: { availableStroops: bigint | null; minimumStroops?: bigint }
): LpAmountValidation {
	if (input.trim() === '') {
		return { ok: false, reason: 'required', message: 'Enter an amount.' };
	}
	const parsed = parseXlmInputToStroops(input);
	if (parsed === 'precision') {
		return {
			ok: false,
			reason: 'precision',
			message: `XLM supports at most ${LP_ASSET_DECIMALS} decimal places.`,
		};
	}
	if (parsed === null) {
		return {
			ok: false,
			reason: 'invalid',
			message: 'Enter a valid number, e.g. 25 or 12.5.',
		};
	}
	if (parsed <= 0n) {
		return {
			ok: false,
			reason: 'non_positive',
			message: 'Amount must be greater than zero.',
		};
	}
	if (parsed < minimumStroops) {
		return {
			ok: false,
			reason: 'below_minimum',
			message: `Minimum deposit is ${formatLpAmount(minimumStroops)}.`,
		};
	}
	if (availableStroops === null) {
		return {
			ok: false,
			reason: 'balance_unavailable',
			message: 'Your available balance could not be loaded.',
		};
	}
	if (parsed > availableStroops) {
		return {
			ok: false,
			reason: 'exceeds_balance',
			message: `Amount exceeds your available balance of ${formatLpAmount(availableStroops)}.`,
		};
	}
	return { ok: true, stroops: parsed };
}

// ---------------------------------------------------------------------------
// Earnings aggregation
// ---------------------------------------------------------------------------

export interface LpEarningsInput {
	lpId: string;
	pendingRewardsStroops: bigint | null;
	claimedRewardsStroops: bigint | null;
}

export interface LpEarningsSummary {
	/** Distinct positions counted (duplicates by `lpId` are ignored). */
	positionCount: number;
	/** Sum of unclaimed rewards, or `null` if any position's rewards are unknown. */
	unclaimedStroops: bigint | null;
	/** Sum of rewards already claimed from still-active positions. */
	claimedStroops: bigint;
	/** `unclaimed + claimed`, or `null` when unclaimed is incomplete. */
	totalStroops: bigint | null;
	/** Number of positions whose accrued rewards could not be read. */
	unavailableCount: number;
}

/**
 * Aggregates LP earnings across positions.
 *
 * - Positions are de-duplicated by `lpId` so a repeated row (e.g. a refetch
 *   merge) is never double-counted.
 * - All positions share one asset (XLM stroops), so summing is meaningful.
 * - Like `computeStakingPortfolioValueStroops`, the total is withheld
 *   (`null`) when any position's rewards are unknown rather than presenting
 *   a partial sum as complete.
 * - A missing `claimedRewards` field counts as zero claimed. It does not make
 *   the total unknown, because the unclaimed side is the authoritative
 *   contract value.
 */
export function summarizeLpEarnings(
	positions: readonly LpEarningsInput[]
): LpEarningsSummary {
	const unique = new Map<string, LpEarningsInput>();
	for (const position of positions) {
		if (!unique.has(position.lpId)) unique.set(position.lpId, position);
	}

	let unclaimed = 0n;
	let claimed = 0n;
	let unavailableCount = 0;
	for (const position of unique.values()) {
		if (position.pendingRewardsStroops == null) {
			unavailableCount += 1;
		} else {
			unclaimed += position.pendingRewardsStroops;
		}
		claimed += position.claimedRewardsStroops ?? 0n;
	}

	const unclaimedStroops = unavailableCount > 0 ? null : unclaimed;
	return {
		positionCount: unique.size,
		unclaimedStroops,
		claimedStroops: claimed,
		totalStroops:
			unclaimedStroops == null ? null : unclaimedStroops + claimed,
		unavailableCount,
	};
}

// ---------------------------------------------------------------------------
// Contract errors
// ---------------------------------------------------------------------------

/**
 * `LpRewardError` codes from the LP reward contract (accesslayer-contracts
 * PR #1004, `creator-keys/src/lp_reward.rs`).
 */
export const LP_CONTRACT_ERROR_MESSAGES: Record<number, string> = {
	1: 'Amount must be greater than zero.',
	2: 'This liquidity position no longer exists.',
	3: 'This wallet is not authorized to manage that position.',
	4: 'There are no rewards to claim right now.',
	5: 'This pool has no liquidity yet.',
	6: 'This liquidity position has already been closed.',
	7: 'The amount is too large for the contract to process.',
};

const CONTRACT_ERROR_PATTERN = /Error\(Contract, #(\d+)\)/;

/** Extracts a Soroban contract error code (`Error(Contract, #N)`) from text. */
export function extractContractErrorCode(text: string): number | null {
	const match = CONTRACT_ERROR_PATTERN.exec(text);
	return match ? Number(match[1]) : null;
}

/** Human-readable message for a contract error code. */
export function describeLpContractErrorCode(code: number): string {
	return (
		LP_CONTRACT_ERROR_MESSAGES[code] ??
		`The liquidity contract rejected this transaction (error #${code}).`
	);
}
