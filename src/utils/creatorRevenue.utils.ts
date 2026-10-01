import type {
	CreatorRevenueSummary,
	CreatorWithdrawalRecord,
	RevenueHistoryPoint,
	RevenueTimeRange,
} from '@/types/creatorRevenue';

function toNonNegative(value: unknown): number {
	if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
		return 0;
	}
	return value;
}

/**
 * Calculates total earnings as the strict sum of royalties, subscription fees, and dividend deposits.
 */
export function calculateTotalEarnings(
	royalties: number | null | undefined,
	subscriptionFees: number | null | undefined,
	dividendDeposits: number | null | undefined
): number {
	return (
		toNonNegative(royalties) +
		toNonNegative(subscriptionFees) +
		toNonNegative(dividendDeposits)
	);
}

/**
 * Normalizes and aggregates raw revenue summary data from API or defaults.
 * Guarantees totalEarnings is consistent with per-source earnings.
 */
export function aggregateRevenueSummary(
	creatorId: string,
	raw?: Partial<CreatorRevenueSummary> | null
): CreatorRevenueSummary {
	const royaltiesEarned = toNonNegative(raw?.royaltiesEarned);
	const subscriptionFees = toNonNegative(raw?.subscriptionFees);
	const dividendDeposits = toNonNegative(raw?.dividendDeposits);
	const totalEarnings =
		raw?.totalEarnings != null &&
		Number.isFinite(raw.totalEarnings) &&
		raw.totalEarnings > 0
			? raw.totalEarnings
			: calculateTotalEarnings(
					royaltiesEarned,
					subscriptionFees,
					dividendDeposits
				);

	const totalWithdrawn = toNonNegative(raw?.totalWithdrawn);
	// Claimable / net proceeds can be provided, or defaults to totalEarnings - totalWithdrawn
	const claimableProceeds =
		raw?.claimableProceeds != null && Number.isFinite(raw.claimableProceeds)
			? Math.max(0, raw.claimableProceeds)
			: Math.max(0, totalEarnings - totalWithdrawn);

	return {
		creatorId,
		royaltiesEarned,
		subscriptionFees,
		dividendDeposits,
		totalEarnings,
		claimableProceeds,
		totalWithdrawn,
		lastUpdated: raw?.lastUpdated ?? Date.now(),
	};
}

/**
 * Checks whether any proceeds are available for withdrawal.
 */
export function hasClaimableProceeds(
	amount: number | null | undefined
): boolean {
	return toNonNegative(amount) > 0;
}

/**
 * Filter and slice revenue history points according to the selected time range.
 */
export function filterRevenueHistoryByTimeRange(
	points: RevenueHistoryPoint[],
	interval: RevenueTimeRange
): RevenueHistoryPoint[] {
	if (!Array.isArray(points) || points.length === 0) return [];

	const now = Date.now();
	let cutoffMs = 0;

	switch (interval) {
		case '24h':
			cutoffMs = now - 24 * 60 * 60 * 1000;
			break;
		case '7d':
			cutoffMs = now - 7 * 24 * 60 * 60 * 1000;
			break;
		case '30d':
			cutoffMs = now - 30 * 24 * 60 * 60 * 1000;
			break;
		case 'all':
		default:
			cutoffMs = 0;
			break;
	}

	if (cutoffMs === 0) {
		return [...points].sort(
			(a, b) =>
				new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
		);
	}

	return points
		.filter(pt => new Date(pt.timestamp).getTime() >= cutoffMs)
		.sort(
			(a, b) =>
				new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
		);
}

/**
 * Builds a deterministic or simulated set of revenue history points for a creator and interval.
 * Used as default mock dataset or fallback if backend endpoint does not return data.
 */
export function generateMockRevenueHistory(
	interval: RevenueTimeRange
): RevenueHistoryPoint[] {
	const now = Date.now();
	const points: RevenueHistoryPoint[] = [];

	let count = 24;
	let stepMs = 60 * 60 * 1000; // 1 hour steps for 24h

	if (interval === '7d') {
		count = 14;
		stepMs = 12 * 60 * 60 * 1000; // 12h steps
	} else if (interval === '30d') {
		count = 30;
		stepMs = 24 * 60 * 60 * 1000; // 1 day steps
	} else if (interval === 'all') {
		count = 12;
		stepMs = 30 * 24 * 60 * 60 * 1000; // monthly steps
	}

	const accRoyalties = 120;
	const accSubscriptions = 45;
	const accDividends = 30;

	for (let i = count - 1; i >= 0; i--) {
		const timestamp = new Date(now - i * stepMs).toISOString();
		// Slightly increase revenue over time
		const royalties =
			Math.round((accRoyalties + (count - i) * 8.5) * 100) / 100;
		const subscriptionFees =
			Math.round((accSubscriptions + (count - i) * 4.2) * 100) / 100;
		const dividendDeposits =
			Math.round((accDividends + (count - i) * 2.8) * 100) / 100;
		const total =
			Math.round((royalties + subscriptionFees + dividendDeposits) * 100) /
			100;

		points.push({
			timestamp,
			royalties,
			subscriptionFees,
			dividendDeposits,
			total,
		});
	}

	return points;
}

type MinimalStorage = Pick<Storage, 'getItem' | 'setItem'>;

function resolveStorage(
	storage?: MinimalStorage | null
): MinimalStorage | null {
	if (storage) return storage;
	if (typeof window !== 'undefined' && window.localStorage) {
		return window.localStorage;
	}
	return null;
}

export function getCreatorWithdrawalStorageKey(creatorId: string): string {
	return `accesslayer:creator_withdrawals:${creatorId}`;
}

function isValidWithdrawalRecord(
	value: unknown
): value is CreatorWithdrawalRecord {
	if (typeof value !== 'object' || value === null) return false;
	const record = value as Record<string, unknown>;
	return (
		typeof record.id === 'string' &&
		typeof record.creatorId === 'string' &&
		typeof record.amount === 'number' &&
		Number.isFinite(record.amount) &&
		typeof record.timestamp === 'number' &&
		Number.isFinite(record.timestamp) &&
		typeof record.transactionHash === 'string' &&
		typeof record.status === 'string'
	);
}

/**
 * Loads withdrawal records for a creator, newest first.
 */
export function loadCreatorWithdrawalHistory(
	creatorId: string,
	storage?: MinimalStorage | null
): CreatorWithdrawalRecord[] {
	const store = resolveStorage(storage);
	if (!creatorId || !store) return [];
	try {
		const raw = store.getItem(getCreatorWithdrawalStorageKey(creatorId));
		if (!raw) return [];
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed
			.filter(isValidWithdrawalRecord)
			.sort((a, b) => b.timestamp - a.timestamp);
	} catch {
		return [];
	}
}

/**
 * Persists withdrawal records for a creator.
 */
export function saveCreatorWithdrawalHistory(
	creatorId: string,
	records: CreatorWithdrawalRecord[],
	storage?: MinimalStorage | null
): void {
	const store = resolveStorage(storage);
	if (!creatorId || !store) return;
	try {
		store.setItem(
			getCreatorWithdrawalStorageKey(creatorId),
			JSON.stringify(records)
		);
	} catch {
		// ignore persistence failure
	}
}

/**
 * Builds a simulated 64-char hex transaction hash for claim transactions.
 */
export function buildMockWithdrawalTxHash(): string {
	return Array.from({ length: 64 }, () =>
		Math.floor(Math.random() * 16).toString(16)
	).join('');
}
