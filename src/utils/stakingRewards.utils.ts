/**
 * Staking-rewards math for the key detail page (#817).
 *
 * The key detail API returns three fields backing the Staking Rewards panel:
 * - `stakingPoolBalance` — XLM currently sitting in the staking reward pool
 * - `totalStaked` — number of keys staked across all holders
 * - `recentFeeInflow` — protocol fees that flowed into the pool over the most
 *   recent period (one month)
 */

export interface StakingPoolStats {
	stakingPoolBalance?: number | null;
	totalStaked?: number | null;
	recentFeeInflow?: number | null;
}

function toNonNegative(value: number | null | undefined): number {
	if (value == null || !Number.isFinite(value) || value <= 0) return 0;
	return value;
}

/**
 * Estimated APY as `recentFeeInflow * 12 / stakingPoolBalance * 100`, i.e. the
 * most recent month's fee inflow annualised and expressed as a percentage of
 * the current pool balance.
 *
 * Returns `null` when it cannot be computed (no pool balance, or missing /
 * non-finite inputs) so callers can render a placeholder rather than
 * `Infinity` / `NaN`.
 */
export function computeEstimatedApy(stats: StakingPoolStats): number | null {
	const poolBalance = toNonNegative(stats.stakingPoolBalance);
	const feeInflow = toNonNegative(stats.recentFeeInflow);

	if (poolBalance === 0) return null;

	return (feeInflow * 12) / poolBalance * 100;
}

/**
 * Whether the key has any staking activity worth showing a panel for. The
 * section is hidden when nothing is staked and the reward pool is empty.
 */
export function hasStakingActivity(stats: StakingPoolStats): boolean {
	return toNonNegative(stats.totalStaked) > 0 || toNonNegative(stats.stakingPoolBalance) > 0;
}
