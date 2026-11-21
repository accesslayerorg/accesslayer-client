import type { RebalanceAllocationInput } from '@/services/rebalance.service';

/** Allocation sums within this tolerance of 100 are treated as valid,
 * absorbing floating point rounding from percentage inputs. */
export const ALLOCATION_SUM_TOLERANCE = 0.01;

export const TARGET_ALLOCATION_TOTAL = 100;

/** Sums the configured target percentages across all allocation rows. */
export function sumTargetAllocations(
	allocations: Array<{ targetPercent: number }>
): number {
	return allocations.reduce(
		(total, allocation) => total + (Number(allocation.targetPercent) || 0),
		0
	);
}

/**
 * Whether the configured allocations sum to exactly 100% (within floating
 * point tolerance). Used to gate the Execute Rebalance button (#1139).
 */
export function isAllocationTotalValid(
	allocations: Array<{ targetPercent: number }>
): boolean {
	const sum = sumTargetAllocations(allocations);
	return Math.abs(sum - TARGET_ALLOCATION_TOTAL) <= ALLOCATION_SUM_TOLERANCE;
}

/** Rounds a running allocation sum for display, avoiding -0 artifacts. */
export function formatAllocationSum(sum: number): string {
	const rounded = Math.round(sum * 100) / 100;
	return `${rounded === 0 ? 0 : rounded}%`;
}

/** Builds the allocations payload the preview/execute API expects, dropping
 * any rows with a non-finite or negative percent. */
export function buildAllocationInputs(
	rows: Array<{ keyId: string; targetPercent: number }>
): RebalanceAllocationInput[] {
	return rows
		.filter(
			row => Number.isFinite(row.targetPercent) && row.targetPercent >= 0
		)
		.map(row => ({ keyId: row.keyId, targetPercent: row.targetPercent }));
}

export function formatSwapDelta(deltaQuantity: number): string {
	if (deltaQuantity === 0) return 'No change';
	const sign = deltaQuantity > 0 ? '+' : '';
	return `${sign}${deltaQuantity} key${Math.abs(deltaQuantity) === 1 ? '' : 's'}`;
}
