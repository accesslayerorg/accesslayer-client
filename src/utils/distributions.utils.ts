import type {
	DistributionType,
	MonthlyDistributionPoint,
} from '@/services/distributionHistory.service';

/** Number of months rendered in the distribution chart. */
export const DISTRIBUTION_CHART_MONTHS = 12;

export interface MonthlyDistributionBucket {
	/** `YYYY-MM` bucket key. */
	month: string;
	/** Short month label, e.g. `Nov`. */
	label: string;
	amount: number;
}

function toMonthKey(value: string): string {
	return value.slice(0, 7);
}

function monthLabel(year: number, monthIndex: number): string {
	return new Date(Date.UTC(year, monthIndex, 1)).toLocaleDateString('en-US', {
		month: 'short',
		timeZone: 'UTC',
	});
}

/**
 * Builds the continuous 12-month series (oldest → newest) the bar chart
 * renders, filling months without distributions with zero so every bar has
 * a stable position.
 */
export function buildMonthlyDistributionSeries(
	monthly: MonthlyDistributionPoint[] | undefined,
	now: Date = new Date()
): MonthlyDistributionBucket[] {
	const amounts = new Map<string, number>();
	for (const point of monthly ?? []) {
		const key = toMonthKey(point.month);
		const amount = Number.isFinite(point.amount)
			? Math.max(point.amount, 0)
			: 0;
		amounts.set(key, (amounts.get(key) ?? 0) + amount);
	}

	const year = now.getUTCFullYear();
	const monthIndex = now.getUTCMonth();
	const series: MonthlyDistributionBucket[] = [];

	for (let offset = DISTRIBUTION_CHART_MONTHS - 1; offset >= 0; offset -= 1) {
		const date = new Date(Date.UTC(year, monthIndex - offset, 1));
		const bucketYear = date.getUTCFullYear();
		const bucketMonth = date.getUTCMonth();
		const key = `${bucketYear}-${String(bucketMonth + 1).padStart(2, '0')}`;

		series.push({
			month: key,
			label: monthLabel(bucketYear, bucketMonth),
			amount: amounts.get(key) ?? 0,
		});
	}

	return series;
}

/**
 * Running total across all distribution types.
 */
export function sumDistributionTotals(
	byType: Partial<Record<DistributionType, number>> | undefined
): number {
	if (!byType) return 0;

	return Object.values(byType).reduce(
		(sum, amount) =>
			sum +
			(typeof amount === 'number' && Number.isFinite(amount)
				? Math.max(amount, 0)
				: 0),
		0
	);
}

/**
 * Running total for the overview. The per-type breakdown is authoritative
 * (it is what the tabs paginate over); the API-provided total is only used
 * when no breakdown is available.
 */
export function resolveDistributionTotal(
	overview:
		| {
				totalReceived: number;
				byType: Partial<Record<DistributionType, number>>;
		  }
		| undefined
): number {
	if (!overview) return 0;

	const summed = sumDistributionTotals(overview.byType);
	if (summed > 0) return summed;

	return Number.isFinite(overview.totalReceived)
		? Math.max(overview.totalReceived, 0)
		: 0;
}

/** True when at least one month in the series has a non-zero amount. */
export function hasDistributionAmount(
	series: MonthlyDistributionBucket[]
): boolean {
	return series.some(bucket => bucket.amount > 0);
}
