/**
 * Vesting-schedule math for creator key allocations (#960).
 *
 * A creator key deployment can reserve a portion of the initial supply for the
 * key's registered creator. That allocation vests on a cliff-then-linear
 * schedule: nothing is claimable until the cliff date passes, and after the
 * cliff the unlocked amount ramps linearly until the vesting end date, at which
 * point the full allocation is vested.
 *
 * The contract remains the source of truth for the vested/claimable amounts —
 * this module derives the same numbers locally from the schedule so the panel
 * can render a progress bar, phase labels, and a disabled-claim explanation
 * without a round trip. All amounts are expressed in XLM (the unit the
 * backend reports vesting values in) — callers converting from stroops should
 * divide by {@link STROOPS_PER_XLM} first.
 */

/** Lifecycle phase of a vesting schedule relative to `now`. */
export type VestingPhase =
	| 'pending'
	| 'pre_cliff'
	| 'vesting'
	| 'completed';

export interface VestingScheduleInput {
	/** Total creator allocation subject to vesting, in XLM. */
	totalAllocation?: number | null;
	/** Amount already claimed by the creator, in XLM. */
	claimedAmount?: number | null;
	/** ISO timestamp (or epoch ms) at which vesting starts. */
	startAt?: string | number | null;
	/** ISO timestamp (or epoch ms) after which tokens unlock. */
	cliffAt?: string | number | null;
	/** ISO timestamp (or epoch ms) at which the allocation is fully vested. */
	endAt?: string | number | null;
	/**
	 * Contract-reported vested amount in XLM. When present it wins over the
	 * locally derived value so the panel always matches on-chain state.
	 */
	vestedAmount?: number | null;
	/**
	 * Contract-reported vested-but-unclaimed amount in XLM. When present it
	 * wins over the locally derived value so the claim action always matches
	 * the amount the contract would transfer.
	 */
	claimableAmount?: number | null;
}

export interface VestingSchedule {
	/** Total allocation subject to vesting, in XLM. */
	totalAllocation: number;
	/** Amount unlocked so far (contract value when reported), in XLM. */
	vestedAmount: number;
	/** Amount already withdrawn by the creator, in XLM. */
	claimedAmount: number;
	/** Vested but not yet claimed, in XLM — the claimable amount. */
	claimableAmount: number;
	/** Percentage of the allocation that has vested (0–100). */
	vestedPercent: number;
	/** Percentage of the allocation that has been claimed (0–100). */
	claimedPercent: number;
	/** Current phase of the schedule. */
	phase: VestingPhase;
	/** Whether the cliff date has passed and claiming is possible. */
	isCliffReached: boolean;
	/** Whether the allocation has fully vested. */
	isFullyVested: boolean;
	/** Whether there is a non-zero amount available to claim. */
	hasClaimableAmount: boolean;
	/** Milliseconds until the cliff, or 0 once it has passed. */
	msUntilCliff: number;
	/** Milliseconds until full vesting, or 0 once complete. */
	msUntilEnd: number;
}

export interface VestingScheduleOptions {
	/** Reference "now" for phase/progress math. Defaults to `Date.now()`. */
	now?: number;
}

function toNonNegative(value: number | null | undefined): number {
	if (value == null || !Number.isFinite(value) || value <= 0) return 0;
	return value;
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

function clampPercent(value: number): number {
	if (!Number.isFinite(value)) return 0;
	return Math.min(100, Math.max(0, value));
}

/**
 * Locally derives the vested amount for a cliff-then-linear schedule.
 *
 * - Before the cliff (or before the schedule starts) nothing is vested.
 * - Between the cliff and the end date the unlocked portion ramps linearly.
 * - At or after the end date the full allocation is vested.
 *
 * Returns 0 when the schedule is missing or malformed so callers never render
 * `NaN`.
 */
export function computeVestedAmount(
	input: VestingScheduleInput,
	options: VestingScheduleOptions = {}
): number {
	const totalAllocation = toNonNegative(input.totalAllocation);
	if (totalAllocation === 0) return 0;

	const now = options.now ?? Date.now();
	const cliffAt = toTimestampMs(input.cliffAt);
	const endAt = toTimestampMs(input.endAt);

	if (cliffAt == null || endAt == null) return 0;
	if (now < cliffAt) return 0;
	if (now >= endAt) return totalAllocation;
	if (endAt <= cliffAt) return totalAllocation;

	const elapsedRatio = (now - cliffAt) / (endAt - cliffAt);
	return totalAllocation * Math.min(1, Math.max(0, elapsedRatio));
}

/**
 * Resolves the full vesting picture for a creator key allocation: the vested,
 * claimed and claimable amounts, the progress percentages, and the current
 * phase of the schedule.
 */
export function resolveVestingSchedule(
	input: VestingScheduleInput = {},
	options: VestingScheduleOptions = {}
): VestingSchedule {
	const now = options.now ?? Date.now();
	const totalAllocation = toNonNegative(input.totalAllocation);
	const claimedAmount = Math.min(
		totalAllocation,
		toNonNegative(input.claimedAmount)
	);

	const contractVested = input.vestedAmount;
	const derivedVested = computeVestedAmount(input, { now });
	const vestedAmount =
		contractVested != null && Number.isFinite(contractVested)
			? Math.min(totalAllocation, Math.max(0, contractVested))
			: derivedVested;

	const contractClaimable = input.claimableAmount;
	const claimableAmount =
		contractClaimable != null && Number.isFinite(contractClaimable)
			? Math.max(0, contractClaimable)
			: Math.max(0, vestedAmount - claimedAmount);

	const cliffAt = toTimestampMs(input.cliffAt);
	const endAt = toTimestampMs(input.endAt);
	const isCliffReached = cliffAt != null && now >= cliffAt;
	const isFullyVested = endAt != null && now >= endAt;

	let phase: VestingPhase = 'pending';
	if (totalAllocation === 0) {
		phase = 'pending';
	} else if (isFullyVested) {
		phase = 'completed';
	} else if (isCliffReached) {
		phase = 'vesting';
	} else {
		phase = 'pre_cliff';
	}

	return {
		totalAllocation,
		vestedAmount,
		claimedAmount,
		claimableAmount,
		vestedPercent:
			totalAllocation === 0
				? 0
				: clampPercent((vestedAmount / totalAllocation) * 100),
		claimedPercent:
			totalAllocation === 0
				? 0
				: clampPercent((claimedAmount / totalAllocation) * 100),
		phase,
		isCliffReached,
		isFullyVested,
		hasClaimableAmount: claimableAmount > 0,
		msUntilCliff: cliffAt == null ? 0 : Math.max(0, cliffAt - now),
		msUntilEnd: endAt == null ? 0 : Math.max(0, endAt - now),
	};
}

/** Human-readable label for a vesting phase, used in the panel header. */
export function describeVestingPhase(schedule: VestingSchedule): string {
	switch (schedule.phase) {
		case 'pre_cliff':
			return 'Locked until the vesting cliff';
		case 'vesting':
			return schedule.isFullyVested
				? 'Fully vested'
				: 'Vesting in progress';
		case 'completed':
			return 'Fully vested';
		case 'pending':
		default:
			return 'Vesting not configured';
	}
}

/**
 * Why the Claim button is disabled, or `null` when a claim can be submitted.
 * Mirrors the `ClaimActionDisabledReason` shape used by the buy flow so both
 * surfaces read the same way.
 */
export function getVestingClaimDisabledReason(
	schedule: VestingSchedule
): string | null {
	if (schedule.totalAllocation === 0) {
		return 'No creator allocation is registered for this key.';
	}
	if (!schedule.isCliffReached) {
		return 'Nothing unlocks until the vesting cliff date.';
	}
	if (!schedule.hasClaimableAmount) {
		return 'Everything vested so far has already been claimed.';
	}
	return null;
}

/**
 * Formats a vesting milestone timestamp for display, e.g. `12 Mar 2027`.
 * Returns `—` for missing or unparseable values.
 */
export function formatVestingDate(
	value: string | number | null | undefined
): string {
	const ms = toTimestampMs(value);
	if (ms == null) return '—';

	return new Intl.DateTimeFormat(undefined, {
		year: 'numeric',
		month: 'short',
		day: '2-digit',
		timeZone: 'UTC',
	}).format(new Date(ms));
}
