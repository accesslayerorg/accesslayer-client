import type { DcaFrequency, DcaPlan } from '@/types/dca.types';

/**
 * Calculates the average price paid per key.
 * Average price equals total spent divided by total quantity bought (#1470).
 * Time Complexity: O(1)
 * Space Complexity: O(1)
 */
export function calculateDcaAveragePrice(
	totalSpentXlm: number,
	totalQuantity: number
): number {
	if (
		!Number.isFinite(totalSpentXlm) ||
		!Number.isFinite(totalQuantity) ||
		totalQuantity <= 0 ||
		totalSpentXlm <= 0
	) {
		return 0;
	}
	return totalSpentXlm / totalQuantity;
}

/**
 * Calculates the next execution timestamp based on frequency and base date.
 * Time Complexity: O(1)
 * Space Complexity: O(1)
 */
export function calculateNextRunTime(
	frequency: DcaFrequency,
	fromDate: Date = new Date()
): string {
	const next = new Date(fromDate.getTime());
	switch (frequency) {
		case 'daily':
			next.setUTCDate(next.getUTCDate() + 1);
			break;
		case 'weekly':
			next.setUTCDate(next.getUTCDate() + 7);
			break;
		case 'monthly':
			next.setUTCMonth(next.getUTCMonth() + 1);
			break;
	}
	return next.toISOString();
}

/**
 * Estimates the approved budget and runs required for a plan.
 * If totalCap is specified, approved budget is capped at totalCap.
 * Otherwise, calculates budget based on duration to endDate or default 30-run allowance.
 * Time Complexity: O(1)
 * Space Complexity: O(1)
 */
export function calculateApprovedBudget(params: {
	amountPerPurchaseXlm: number;
	frequency: DcaFrequency;
	endDate?: string | null;
	totalCapXlm?: number | null;
}): { approvedBudgetXlm: number; estimatedRuns: number } {
	const { amountPerPurchaseXlm, frequency, endDate, totalCapXlm } = params;

	if (totalCapXlm != null && totalCapXlm > 0) {
		const estimatedRuns = Math.max(1, Math.floor(totalCapXlm / amountPerPurchaseXlm));
		return {
			approvedBudgetXlm: totalCapXlm,
			estimatedRuns,
		};
	}

	if (endDate) {
		const end = new Date(endDate);
		const now = new Date();
		const diffMs = Math.max(0, end.getTime() - now.getTime());
		const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

		let estimatedRuns = 1;
		if (frequency === 'daily') {
			estimatedRuns = Math.max(1, diffDays);
		} else if (frequency === 'weekly') {
			estimatedRuns = Math.max(1, Math.ceil(diffDays / 7));
		} else if (frequency === 'monthly') {
			estimatedRuns = Math.max(1, Math.ceil(diffDays / 30));
		}

		return {
			approvedBudgetXlm: Number((estimatedRuns * amountPerPurchaseXlm).toFixed(2)),
			estimatedRuns,
		};
	}

	// Default: 10 cycles approved budget buffer
	const defaultRuns = frequency === 'daily' ? 30 : frequency === 'weekly' ? 12 : 6;
	return {
		approvedBudgetXlm: Number((defaultRuns * amountPerPurchaseXlm).toFixed(2)),
		estimatedRuns: defaultRuns,
	};
}

/**
 * Checks whether a plan should automatically pause due to 3 consecutive failures.
 * Returns true if the plan should be paused.
 * Time Complexity: O(1)
 * Space Complexity: O(1)
 */
export function checkConsecutiveFailureAutoPause(
	consecutiveFailures: number,
	maxAllowedFailures: number = 3
): boolean {
	return consecutiveFailures >= maxAllowedFailures;
}

/**
 * Aggregates runs to compute updated totals and average price.
 * Time Complexity: O(n) where n is runs length
 * Space Complexity: O(1)
 */
export function recalculatePlanStats(
	runs: DcaPlan['runs']
): {
	totalInvestedXlm: number;
	totalQuantityBought: number;
	averagePriceXlm: number;
	consecutiveFailures: number;
} {
	let totalInvestedXlm = 0;
	let totalQuantityBought = 0;
	let consecutiveFailures = 0;

	// Runs are chronological or reverse chronological; iterate to calculate consecutive failures from latest
	for (const run of runs) {
		if (run.status === 'success') {
			totalInvestedXlm += run.spentXlm ?? 0;
			totalQuantityBought += run.quantity ?? 0;
		}
	}

	// Consecutive failures count from most recent runs backwards
	for (let i = runs.length - 1; i >= 0; i--) {
		if (runs[i].status === 'failed' || runs[i].status === 'skipped') {
			consecutiveFailures++;
		} else if (runs[i].status === 'success') {
			break;
		}
	}

	const averagePriceXlm = calculateDcaAveragePrice(totalInvestedXlm, totalQuantityBought);

	return {
		totalInvestedXlm: Number(totalInvestedXlm.toFixed(4)),
		totalQuantityBought,
		averagePriceXlm: Number(averagePriceXlm.toFixed(4)),
		consecutiveFailures,
	};
}
