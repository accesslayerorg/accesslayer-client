/**
 * Protocol-revenue math for stakers (#920).
 *
 * Claim-based dividend model: trading fees accumulate in a revenue pool and
 * each staker can claim `userStaked / totalStaked * feePool`. The client
 * surfaces the already-accrued `unclaimedDividend` per position as the
 * claimable amount; this module holds the pure share math plus the
 * localStorage-backed claim-history helpers (no backend endpoint exists yet).
 */

export interface RevenueShareInputs {
	userStaked?: number | null;
	totalStaked?: number | null;
	feePool?: number | null;
}

export interface RevenueClaimRecord {
	id: string;
	amount: number;
	timestamp: number;
	transactionHash: string;
	creatorId?: string;
	creatorName?: string;
}

function toNonNegative(value: number | null | undefined): number {
	if (value == null || !Number.isFinite(value) || value <= 0) return 0;
	return value;
}

/**
 * Each staker's share of the revenue pool, pro-rata by staked keys.
 * Returns 0 when inputs are missing/invalid so callers never render
 * Infinity/NaN.
 */
export function computeRevenueShare(inputs: RevenueShareInputs): number {
	const userStaked = toNonNegative(inputs.userStaked);
	const totalStaked = toNonNegative(inputs.totalStaked);
	const feePool = toNonNegative(inputs.feePool);

	if (userStaked === 0 || totalStaked === 0 || feePool === 0) return 0;

	const share = (userStaked / totalStaked) * feePool;
	if (!Number.isFinite(share) || share <= 0) return 0;
	return share;
}

/**
 * Sums per-position claimable amounts, ignoring missing/invalid entries.
 */
export function computeTotalClaimable(
	amounts: Array<number | null | undefined>
): number {
	return amounts.reduce<number>(
		(total, amount) => total + toNonNegative(amount),
		0
	);
}

/**
 * Whether any revenue is available to claim.
 */
export function hasClaimableRevenue(
	totalClaimable: number | null | undefined
): boolean {
	return toNonNegative(totalClaimable) > 0;
}

export function getClaimHistoryStorageKey(address: string): string {
	return `accesslayer:claim_history:${address}`;
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

function isValidRecord(value: unknown): value is RevenueClaimRecord {
	if (typeof value !== 'object' || value === null) return false;
	const record = value as Record<string, unknown>;
	return (
		typeof record.id === 'string' &&
		typeof record.amount === 'number' &&
		Number.isFinite(record.amount) &&
		typeof record.timestamp === 'number' &&
		Number.isFinite(record.timestamp) &&
		typeof record.transactionHash === 'string'
	);
}

/**
 * Loads persisted claim history for a wallet, newest first.
 * Returns [] when storage is unavailable or the payload is corrupt.
 */
export function loadClaimHistory(
	address: string,
	storage?: MinimalStorage | null
): RevenueClaimRecord[] {
	const store = resolveStorage(storage);
	if (!address || !store) return [];
	try {
		const raw = store.getItem(getClaimHistoryStorageKey(address));
		if (!raw) return [];
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed
			.filter(isValidRecord)
			.sort((a, b) => b.timestamp - a.timestamp);
	} catch {
		return [];
	}
}

/**
 * Persists claim history for a wallet. Failures (quota/private mode)
 * are swallowed so claiming never breaks.
 */
export function saveClaimHistory(
	address: string,
	records: RevenueClaimRecord[],
	storage?: MinimalStorage | null
): void {
	const store = resolveStorage(storage);
	if (!address || !store) return;
	try {
		store.setItem(
			getClaimHistoryStorageKey(address),
			JSON.stringify(records)
		);
	} catch {
		// ignore persistence failures
	}
}

/**
 * Builds a mock 64-char hex transaction hash for the simulated
 * batched `claim_revenue` contract call.
 */
export function buildMockTransactionHash(): string {
	return Array.from({ length: 64 }, () =>
		Math.floor(Math.random() * 16).toString(16)
	).join('');
}
