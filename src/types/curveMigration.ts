/**
 * Curve migration types for Access Layer.
 *
 * A curve migration changes the bonding-curve parameters of a creator key.
 * Because the curve governs pricing for every holder, a migration is a
 * governance action with two independent gates before it can be applied:
 *
 * 1. **Vote approval** — the proposal must reach quorum and carry more weight
 *    `for` than `against` (see `@/utils/governance.utils`).
 * 2. **Timelock** — after the vote passes, a delay window gives holders time
 *    to exit before the new curve goes live.
 *
 * Only once both gates are satisfied can the creator call
 * `execute_curve_migration` to apply {@link CurveMigration.proposedParams}.
 * Executed migrations are retained as history so the applied params and the
 * execution date stay auditable.
 */

/** A single graduated-curve milestone carried by a migration. */
export interface CurveMigrationMilestone {
	/** Supply threshold at which the tier starts. */
	supply: number;
	/** Exponent applied to the tier's price curve. */
	exponent: number;
}

/** The set of curve parameters a migration can change. */
export interface CurveMigrationParams {
	/** Base price in stroops applied when supply is zero. */
	basePriceStroops: number;
	/** Per-key growth factor (e.g. `1.01` for 1% growth). */
	growthFactor: number;
	/** Graduated curve tiers, ascending by supply threshold. */
	milestones: CurveMigrationMilestone[];
}

/**
 * Lifecycle of a curve migration.
 *
 * `pending` migrations are still actionable (vote running or timelock
 * counting down); every other status is terminal and rendered in history.
 */
export type CurveMigrationStatus =
	| 'pending'
	| 'executed'
	| 'rejected'
	| 'cancelled'
	| 'expired';

/**
 * A curve migration proposal fetched from the backend API.
 *
 * Vote fields mirror the governance proposal payload so the same quorum
 * helpers can be reused.
 */
export interface CurveMigration {
	id: string;
	/** Creator key the migration applies to. */
	keyId: string;
	title: string;
	description?: string;
	status: CurveMigrationStatus;
	/** Params currently live on-chain. */
	currentParams: CurveMigrationParams;
	/** Params applied once the migration is executed. */
	proposedParams: CurveMigrationParams;
	/**
	 * When the timelock expires and the migration becomes executable. ISO
	 * string or epoch milliseconds; epoch **seconds** are also accepted.
	 */
	timelockEndsAt: string | number;
	/** Aggregate weight of `for` votes. */
	forVotes: number;
	/** Aggregate weight of `against` votes. */
	againstVotes: number;
	/** Quorum threshold in basis points (e.g. `4000` = 40%). */
	quorumBps: number;
	/** Weight that can participate in the vote. */
	eligibleVotingWeight?: number;
	/** Total circulating supply of the key — fallback for eligible weight. */
	totalCirculatingSupply: number;
	/** Aggregate weight cast so far. */
	totalVotingWeight: number;
	/** ISO timestamp / epoch ms of execution; `null` until executed. */
	executedAt?: string | number | null;
	/** Wallet that submitted the execute transaction. */
	executedBy?: string | null;
	/** Transaction hash of the execution, when reported. */
	transactionHash?: string | null;
}
