/**
 * Curve migration math for the creator dashboard.
 *
 * A curve migration is a governance action that swaps a creator key's
 * bonding-curve parameters. Two independent gates must both be satisfied
 * before the creator can execute it:
 *
 * 1. **Vote approval** — quorum reached *and* more weight `for` than
 *    `against` (reusing the governance helpers in `@/utils/governance.utils`).
 * 2. **Timelock elapsed** — the post-vote delay has passed, so holders had
 *    a window to exit before the new pricing goes live.
 *
 * Everything here is pure so the panel, the execute mutation, and the tests
 * all agree on when an execute is allowed.
 */

import {
	getEligibleVotingWeight,
	getParticipationPercentage,
	isQuorumMet,
} from '@/utils/governance.utils';
import { formatCountdownTime } from '@/utils/lockupCountdown.utils';
import { formatDisplayKeyPrice } from '@/utils/keyPriceDisplay.utils';
import { formatNumber } from '@/utils/numberFormat.utils';
import type {
	CurveMigration,
	CurveMigrationParams,
	CurveMigrationStatus,
} from '@/types/curveMigration';

/** Sub-second values are treated as epoch seconds rather than milliseconds. */
const EPOCH_SECONDS_CEILING = 1e11;

/** Contract function invoked to apply an approved, unlocked migration. */
export const EXECUTE_CURVE_MIGRATION_FUNCTION = 'execute_curve_migration';

/** Vote fields shared with a governance proposal, used for quorum math. */
export type CurveMigrationVoteFields = Pick<
	CurveMigration,
	| 'forVotes'
	| 'againstVotes'
	| 'quorumBps'
	| 'eligibleVotingWeight'
	| 'totalCirculatingSupply'
	| 'totalVotingWeight'
>;

/**
 * Normalizes an ISO string, epoch milliseconds, or epoch seconds into
 * milliseconds. Returns `null` for missing or unparseable values.
 */
export function toTimestampMs(
	value: string | number | null | undefined
): number | null {
	if (value == null) return null;

	if (typeof value === 'number') {
		if (!Number.isFinite(value)) return null;
		return value > 0 && value < EPOCH_SECONDS_CEILING ? value * 1000 : value;
	}

	const parsed = new Date(value).getTime();
	return Number.isNaN(parsed) ? null : parsed;
}

/** True while a migration is still awaiting vote approval or timelock. */
export function isPendingCurveMigration(
	migration: Pick<CurveMigration, 'status'>
): boolean {
	return migration.status === 'pending';
}

/**
 * Milliseconds left on the timelock, floored at zero. Returns 0 when the
 * migration reports no timelock so the panel never renders `NaN`.
 */
export function getCurveMigrationTimelockRemainingMs(
	migration: Pick<CurveMigration, 'timelockEndsAt'>,
	now: number = Date.now()
): number {
	const endsAt = toTimestampMs(migration.timelockEndsAt);
	if (endsAt == null) return 0;
	return Math.max(0, endsAt - now);
}

/** True once the timelock delay has fully elapsed. */
export function isCurveMigrationTimelockElapsed(
	migration: Pick<CurveMigration, 'timelockEndsAt'>,
	now: number = Date.now()
): boolean {
	return getCurveMigrationTimelockRemainingMs(migration, now) === 0;
}

/**
 * Share of cast weight that voted `for`, as a percentage (0–100).
 *
 * Returns 0 when no weight has been cast, so a fresh proposal reads as 0%
 * rather than dividing by zero.
 */
export function getCurveMigrationApprovalPercent(
	migration: Pick<CurveMigration, 'forVotes' | 'againstVotes'>
): number {
	const forVotes = toWeight(migration.forVotes);
	const againstVotes = toWeight(migration.againstVotes);
	const total = forVotes + againstVotes;
	if (total <= 0) return 0;
	return (forVotes / total) * 100;
}

/** Participation as a percentage of the weight eligible to vote. */
export function getCurveMigrationParticipationPercent(
	migration: CurveMigrationVoteFields
): number {
	return getParticipationPercentage(
		toWeight(migration.totalVotingWeight),
		getEligibleVotingWeight(migration)
	);
}

/**
 * True when the vote carried the migration: quorum reached and strictly more
 * weight in favour than against.
 */
export function isCurveMigrationVoteApproved(
	migration: CurveMigrationVoteFields
): boolean {
	const quorumMet = isQuorumMet(
		toWeight(migration.totalVotingWeight),
		getEligibleVotingWeight(migration),
		migration.quorumBps
	);
	if (!quorumMet) return false;
	return toWeight(migration.forVotes) > toWeight(migration.againstVotes);
}

/**
 * Whether the creator may execute the migration right now: the migration is
 * still pending, the timelock has elapsed, and the vote carried it.
 */
export function canExecuteCurveMigration(
	migration: CurveMigration,
	now: number = Date.now()
): boolean {
	return (
		isPendingCurveMigration(migration) &&
		isCurveMigrationTimelockElapsed(migration, now) &&
		isCurveMigrationVoteApproved(migration)
	);
}

/**
 * Why the Execute button is disabled, or `null` when it can be submitted.
 *
 * Ordered so the creator sees the first blocker they still need to clear.
 */
export function getCurveMigrationExecuteDisabledReason(
	migration: CurveMigration,
	now: number = Date.now()
): string | null {
	if (!isPendingCurveMigration(migration)) {
		return 'This migration is no longer pending.';
	}
	if (!isCurveMigrationTimelockElapsed(migration, now)) {
		return 'Waiting for the timelock to elapse before this migration can be executed.';
	}
	if (!isCurveMigrationVoteApproved(migration)) {
		return 'The vote has not reached quorum with enough support to execute this migration.';
	}
	return null;
}

/** Formats a timelock countdown as `HH:MM:SS`, or `Ready` once elapsed. */
export function formatCurveMigrationCountdown(remainingMs: number): string {
	if (!Number.isFinite(remainingMs) || remainingMs <= 0) return 'Ready';
	return formatCountdownTime(Math.floor(remainingMs / 1000));
}

/**
 * Formats a migration timestamp for display, e.g. `12 Mar 2027`.
 * Returns `—` for missing or unparseable values.
 */
export function formatCurveMigrationDate(
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

/** The curve parameter a change refers to. */
export type CurveParamField = 'basePriceStroops' | 'growthFactor' | 'milestones';

export interface CurveParamChange {
	field: CurveParamField;
	label: string;
	/** Formatted value currently live on-chain. */
	from: string;
	/** Formatted value the migration would apply. */
	to: string;
	/** Whether the migration actually changes this parameter. */
	changed: boolean;
}

const CURVE_PARAM_LABELS: Record<CurveParamField, string> = {
	basePriceStroops: 'Base price',
	growthFactor: 'Growth factor',
	milestones: 'Graduated curve',
};

function formatGrowthFactor(value: number | null | undefined): string {
	if (value == null || !Number.isFinite(value)) return '—';
	return `${formatNumber(value, {
		minimumFractionDigits: 0,
		maximumFractionDigits: 4,
	})}×`;
}

function formatMilestones(
	milestones: CurveMigrationParams['milestones'] | null | undefined
): string {
	if (!Array.isArray(milestones) || milestones.length === 0) return 'None';
	return `${milestones.length} tier${milestones.length === 1 ? '' : 's'}`;
}

function milestonesEqual(
	a: CurveMigrationParams['milestones'] | null | undefined,
	b: CurveMigrationParams['milestones'] | null | undefined
): boolean {
	const left = Array.isArray(a) ? a : [];
	const right = Array.isArray(b) ? b : [];
	if (left.length !== right.length) return false;
	return left.every(
		(milestone, index) =>
			Number(milestone?.supply) === Number(right[index]?.supply) &&
			Number(milestone?.exponent) === Number(right[index]?.exponent)
	);
}

/**
 * Per-parameter diff between the live curve and the proposed one, in a fixed
 * display order. Used by both the pending proposal card and the executed
 * history rows.
 */
export function getCurveParamChanges(
	current: CurveMigrationParams | null | undefined,
	proposed: CurveMigrationParams | null | undefined
): CurveParamChange[] {
	const currentBase = current?.basePriceStroops;
	const proposedBase = proposed?.basePriceStroops;
	const currentGrowth = current?.growthFactor;
	const proposedGrowth = proposed?.growthFactor;

	return [
		{
			field: 'basePriceStroops',
			label: CURVE_PARAM_LABELS.basePriceStroops,
			from: formatDisplayKeyPrice(currentBase ?? null),
			to: formatDisplayKeyPrice(proposedBase ?? null),
			changed:
				Number.isFinite(currentBase) &&
				Number.isFinite(proposedBase) &&
				currentBase !== proposedBase,
		},
		{
			field: 'growthFactor',
			label: CURVE_PARAM_LABELS.growthFactor,
			from: formatGrowthFactor(currentGrowth),
			to: formatGrowthFactor(proposedGrowth),
			changed:
				Number.isFinite(currentGrowth) &&
				Number.isFinite(proposedGrowth) &&
				currentGrowth !== proposedGrowth,
		},
		{
			field: 'milestones',
			label: CURVE_PARAM_LABELS.milestones,
			from: formatMilestones(current?.milestones),
			to: formatMilestones(proposed?.milestones),
			changed: !milestonesEqual(current?.milestones, proposed?.milestones),
		},
	];
}

export interface PartitionedCurveMigrations {
	/** Migrations still awaiting execution, soonest timelock first. */
	pending: CurveMigration[];
	/** Executed migrations, most recently executed first. */
	executed: CurveMigration[];
}

/**
 * Splits migrations into the actionable pending list and the executed history.
 * Terminal-but-unexecuted records (rejected / cancelled / expired) are dropped
 * from both lists so the panel only ever shows work that can move forward.
 */
export function partitionCurveMigrations(
	migrations: CurveMigration[] | null | undefined
): PartitionedCurveMigrations {
	const list = Array.isArray(migrations) ? migrations : [];

	const pending = list
		.filter(isPendingCurveMigration)
		.sort(
			(a, b) =>
				(toTimestampMs(a.timelockEndsAt) ?? 0) -
				(toTimestampMs(b.timelockEndsAt) ?? 0)
		);
	const executed = list
		.filter(migration => migration.status === 'executed')
		.sort(
			(a, b) =>
				(toTimestampMs(b.executedAt) ?? 0) - (toTimestampMs(a.executedAt) ?? 0)
		);

	return { pending, executed };
}

/** The contract call submitted to apply an approved migration. */
export interface CurveMigrationExecuteCall {
	functionName: string;
	args: {
		creatorId: string;
		migrationId: string;
	};
}

/**
 * Builds the `execute_curve_migration` call for a migration. Kept pure so the
 * exact contract call can be asserted in tests without signing anything.
 */
export function buildCurveMigrationExecuteCall(input: {
	creatorId: string;
	migrationId: string;
}): CurveMigrationExecuteCall {
	return {
		functionName: EXECUTE_CURVE_MIGRATION_FUNCTION,
		args: {
			creatorId: input.creatorId,
			migrationId: input.migrationId,
		},
	};
}

/** Statuses that close a migration out without executing it. */
export const TERMINAL_CURVE_MIGRATION_STATUSES: readonly CurveMigrationStatus[] = [
	'executed',
	'rejected',
	'cancelled',
	'expired',
];

function toWeight(value: number | null | undefined): number {
	if (value == null || !Number.isFinite(value)) return 0;
	return Math.max(0, value);
}
