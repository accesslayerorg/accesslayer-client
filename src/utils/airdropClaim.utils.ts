/**
 * Airdrop claim helpers for key holders.
 *
 * Airdrop allocations are fetched from the backend per wallet; claimed
 * state is tracked locally (mirroring the protocol-revenue claim history
 * pattern) since no claim-status endpoint exists yet. Pure functions only
 * so everything is unit-testable without React.
 */

export interface AirdropAllocation {
	id: string;
	keyId: string;
	keyName?: string;
	snapshotDate: string;
	totalDistributed: number;
	userAllocation: number;
}

export interface AirdropClaimRecord {
	id: string;
	keyId: string;
	keyName?: string;
	amount: number;
	timestamp: number;
	transactionHash: string;
}

export interface AirdropKeyGroup {
	keyId: string;
	keyName?: string;
	airdrops: AirdropAllocation[];
}

function toNonNegative(value: number | null | undefined): number {
	if (value == null || !Number.isFinite(value) || value <= 0) return 0;
	return value;
}

export function computeTotalAllocation(
	airdrops: AirdropAllocation[]
): number {
	return airdrops.reduce(
		(total, airdrop) => total + toNonNegative(airdrop.userAllocation),
		0
	);
}

export function getAirdropClaimHistoryStorageKey(address: string): string {
	return `accesslayer:airdrop_claim_history:${address}`;
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

function isValidRecord(value: unknown): value is AirdropClaimRecord {
	if (typeof value !== 'object' || value === null) return false;
	const record = value as Record<string, unknown>;
	return (
		typeof record.id === 'string' &&
		typeof record.keyId === 'string' &&
		typeof record.amount === 'number' &&
		Number.isFinite(record.amount) &&
		typeof record.timestamp === 'number' &&
		Number.isFinite(record.timestamp) &&
		typeof record.transactionHash === 'string'
	);
}

/**
 * Loads persisted airdrop claim history for a wallet, newest first.
 * Returns [] when storage is unavailable or the payload is corrupt.
 */
export function loadAirdropClaimHistory(
	address: string,
	storage?: MinimalStorage | null
): AirdropClaimRecord[] {
	const store = resolveStorage(storage);
	if (!address || !store) return [];
	try {
		const raw = store.getItem(getAirdropClaimHistoryStorageKey(address));
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
 * Persists airdrop claim history for a wallet. Failures (quota/private
 * mode) are swallowed so claiming never breaks.
 */
export function saveAirdropClaimHistory(
	address: string,
	records: AirdropClaimRecord[],
	storage?: MinimalStorage | null
): void {
	const store = resolveStorage(storage);
	if (!address || !store) return;
	try {
		store.setItem(
			getAirdropClaimHistoryStorageKey(address),
			JSON.stringify(records)
		);
	} catch {
		// ignore persistence failures
	}
}

/**
 * Ids of airdrops already claimed by the wallet (derived from history).
 */
export function getClaimedAirdropIds(
	history: AirdropClaimRecord[]
): Set<string> {
	return new Set(history.map(record => record.id));
}

/**
 * Allocations that have not been claimed yet, preserving input order.
 */
export function getUnclaimedAirdrops(
	allocations: AirdropAllocation[],
	history: AirdropClaimRecord[]
): AirdropAllocation[] {
	const claimedIds = getClaimedAirdropIds(history);
	return allocations.filter(airdrop => !claimedIds.has(airdrop.id));
}

/**
 * Groups allocations by `keyId` so the claims page can render one
 * section per held key. Groups keep first-seen order; airdrops inside
 * each group are sorted by snapshot date descending.
 */
export function groupAirdropsByKey(
	allocations: AirdropAllocation[]
): AirdropKeyGroup[] {
	const groups = new Map<string, AirdropKeyGroup>();
	for (const airdrop of allocations) {
		const existing = groups.get(airdrop.keyId);
		if (existing) {
			existing.airdrops.push(airdrop);
		} else {
			groups.set(airdrop.keyId, {
				keyId: airdrop.keyId,
				keyName: airdrop.keyName,
				airdrops: [airdrop],
			});
		}
	}
	for (const group of groups.values()) {
		group.airdrops.sort(
			(a, b) =>
				new Date(b.snapshotDate).getTime() -
				new Date(a.snapshotDate).getTime()
		);
	}
	return [...groups.values()];
}

/**
 * Builds the persisted claim record for a successful `claim_airdrop`
 * contract call.
 */
export function buildAirdropClaimRecord(
	airdrop: AirdropAllocation,
	transactionHash: string,
	claimedAt: number
): AirdropClaimRecord {
	return {
		id: airdrop.id,
		keyId: airdrop.keyId,
		keyName: airdrop.keyName,
		amount: toNonNegative(airdrop.userAllocation),
		timestamp: claimedAt,
		transactionHash,
	};
}
