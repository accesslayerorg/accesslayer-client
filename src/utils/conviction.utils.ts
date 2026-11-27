import type {
	ConvictionBalances,
	ConvictionProjection,
} from '@/types/conviction';

export const DEFAULT_CONVICTION_ALPHA = 0.9;
export const DEFAULT_STEP_DURATION_SECONDS = 60; // 1 step = 1 minute

/**
 * Calculates the maximum reachable conviction for a given stake and alpha parameter.
 * Formula: C_max = S / (1 - alpha)
 */
export function calculateMaxConviction(
	totalStake: number,
	alpha: number = DEFAULT_CONVICTION_ALPHA
): number {
	if (totalStake <= 0 || alpha >= 1 || alpha <= 0) return 0;
	return totalStake / (1 - alpha);
}

/**
 * Formats seconds into a human-readable duration for conviction projection.
 */
export function formatProjectedDuration(seconds: number): string {
	if (seconds <= 0) return 'Threshold reached';
	if (seconds < 60) return 'Estimated crossing in < 1 min';
	const minutes = Math.round(seconds / 60);
	if (minutes < 60) return `Estimated crossing in ~${minutes} min${minutes === 1 ? '' : 's'}`;
	const hours = Math.round(minutes / 60);
	if (hours < 24) return `Estimated crossing in ~${hours} hour${hours === 1 ? '' : 's'}`;
	const days = Math.round(hours / 24);
	return `Estimated crossing in ~${days} day${days === 1 ? '' : 's'}`;
}

/**
 * Calculates the projected time until a proposal's conviction reaches the threshold.
 */
export function calculateConvictionProjection(
	currentConviction: number,
	threshold: number,
	totalStake: number,
	alpha: number = DEFAULT_CONVICTION_ALPHA,
	stepDurationSeconds: number = DEFAULT_STEP_DURATION_SECONDS
): ConvictionProjection {
	const validConviction = Math.max(0, currentConviction);
	const validThreshold = Math.max(0, threshold);
	const validStake = Math.max(0, totalStake);
	const validAlpha = alpha > 0 && alpha < 1 ? alpha : DEFAULT_CONVICTION_ALPHA;

	// If already at or above threshold
	if (validConviction >= validThreshold && validThreshold > 0) {
		return {
			isCrossed: true,
			isReachable: true,
			maxConviction: calculateMaxConviction(validStake, validAlpha),
			projectedSeconds: 0,
			displayText: 'Threshold reached - ready to execute',
		};
	}

	const maxConviction = calculateMaxConviction(validStake, validAlpha);

	// If max possible conviction is less than threshold, it can never cross with current stake
	if (maxConviction < validThreshold || validStake <= 0) {
		return {
			isCrossed: false,
			isReachable: false,
			maxConviction,
			projectedSeconds: null,
			displayText: 'Threshold unreachable with current stake',
		};
	}

	// Solve for t in: y(t) = y0 * alpha^t + (S / (1 - alpha)) * (1 - alpha^t) = T
	// alpha^t = (maxConviction - T) / (maxConviction - y0)
	const numerator = maxConviction - validThreshold;
	const denominator = maxConviction - validConviction;

	if (denominator <= 0 || numerator <= 0) {
		return {
			isCrossed: true,
			isReachable: true,
			maxConviction,
			projectedSeconds: 0,
			displayText: 'Threshold reached - ready to execute',
		};
	}

	const ratio = numerator / denominator;
	if (ratio <= 0) {
		return {
			isCrossed: true,
			isReachable: true,
			maxConviction,
			projectedSeconds: 0,
			displayText: 'Threshold reached - ready to execute',
		};
	}

	const steps = Math.log(ratio) / Math.log(validAlpha);
	const projectedSeconds = Math.max(0, Math.ceil(steps * stepDurationSeconds));

	return {
		isCrossed: false,
		isReachable: true,
		maxConviction,
		projectedSeconds,
		displayText: formatProjectedDuration(projectedSeconds),
	};
}

/**
 * Calculates user's unallocated governance balance across all proposals.
 */
export function calculateConvictionBalances(
	totalStakeableBalance: number,
	allocations: Record<string, number> | number[]
): ConvictionBalances {
	const totalStakeable = Math.max(0, totalStakeableBalance);
	const allocatedValues = Array.isArray(allocations)
		? allocations
		: Object.values(allocations);

	const totalAllocated = allocatedValues.reduce(
		(sum, val) => sum + Math.max(0, val || 0),
		0
	);

	const unallocatedBalance = Math.max(0, totalStakeable - totalAllocated);

	return {
		totalStakeableBalance: totalStakeable,
		totalAllocatedStake: totalAllocated,
		unallocatedBalance,
	};
}

/**
 * Returns the maximum stake a user can allocate to a specific proposal,
 * taking into account their unallocated balance and current allocation on that proposal.
 */
export function getMaxStakeForProposal(
	unallocatedBalance: number,
	currentProposalStake: number = 0
): number {
	return Math.max(0, unallocatedBalance) + Math.max(0, currentProposalStake);
}
