import type { KeyHolderEntry } from '@/services/course.service';
import type {
	RevenueShareClaim,
	RevenueShareDistribution,
} from '@/types/revenueShare';
import type { RevenueDistributionRecord } from '@/types/creatorRevenue';
import { roundToTwoDecimals } from '@/utils/creatorRevenue.utils';

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

/** Storage key holding the claims a wallet made for one key. */
export function getRevenueShareClaimsStorageKey(
	keyId: string,
	wallet: string
): string {
	return `accesslayer:revenue_share_claims:${keyId}:${wallet.toLowerCase()}`;
}

/**
 * Computes a holder's pro-rata share of a distribution.
 *
 * Uses the same model as the creator-side preview: a holder's share is their
 * key count over the total keys held by every eligible holder. Returns 0 when
 * the wallet holds no keys, or when the amount is not usable.
 */
export function computeHolderProRataShare(
	holders: KeyHolderEntry[] | null | undefined,
	wallet: string | null | undefined,
	amount: number
): number {
	if (!wallet || !Number.isFinite(amount) || amount <= 0) return 0;

	const eligible = (holders ?? []).filter(holder => holder.keyCount > 0);
	const totalKeys = eligible.reduce(
		(sum, holder) => sum + holder.keyCount,
		0
	);
	if (totalKeys <= 0) return 0;

	const mine = eligible.find(
		holder => holder.walletAddress.toLowerCase() === wallet.toLowerCase()
	);
	if (!mine) return 0;

	return roundToTwoDecimals(amount * (mine.keyCount / totalKeys));
}

/** Sums the shares a holder can still claim. */
export function totalClaimableShare(
	distributions: readonly RevenueShareDistribution[]
): number {
	return roundToTwoDecimals(
		distributions
			.filter(distribution => !distribution.claimed)
			.reduce((sum, distribution) => sum + distribution.userShare, 0)
	);
}

/** Lists the distributions a holder can still claim, oldest first. */
export function selectUnclaimedDistributions(
	distributions: readonly RevenueShareDistribution[]
): RevenueShareDistribution[] {
	return distributions
		.filter(distribution => !distribution.claimed)
		.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Converts a creator-side distribution record into the holder's view of it.
 *
 * The holder's own share is left at 0 so it is resolved from the holder's key
 * count (or taken from the server) rather than guessed here.
 */
export function toRevenueShareDistribution(
	record: RevenueDistributionRecord
): RevenueShareDistribution {
	return {
		id: record.id,
		creatorId: record.creatorId,
		amount: record.amount,
		timestamp: record.timestamp,
		holderCount: record.holderCount,
		userShare: 0,
		claimed: false,
		receivedAmount: null,
		claimedAt: null,
	};
}

/**
 * Merges the distributions recorded by the creator with the ones the server
 * reports.
 *
 * The server stays the source of truth — a distribution it already knows wins —
 * and the locally recorded ones fill the gap, so a creator who distributed
 * revenue can see it listed before the read endpoint is deployed.
 */
export function mergeRevenueDistributions(
	remote: readonly RevenueShareDistribution[],
	local: readonly RevenueDistributionRecord[]
): RevenueShareDistribution[] {
	const merged = new Map<string, RevenueShareDistribution>();

	for (const record of local) {
		merged.set(record.id, toRevenueShareDistribution(record));
	}
	for (const distribution of remote) {
		merged.set(distribution.id, distribution);
	}

	return [...merged.values()].sort((a, b) => b.timestamp - a.timestamp);
}

function isValidClaim(value: unknown): value is RevenueShareClaim {
	if (typeof value !== 'object' || value === null) return false;
	const claim = value as Record<string, unknown>;
	return (
		typeof claim.distributionId === 'string' &&
		claim.distributionId !== '' &&
		typeof claim.receivedAmount === 'number' &&
		Number.isFinite(claim.receivedAmount) &&
		typeof claim.claimedAt === 'number' &&
		Number.isFinite(claim.claimedAt)
	);
}

/**
 * Loads the claims a wallet made for a key, newest first.
 */
export function loadRevenueShareClaims(
	keyId: string,
	wallet: string | undefined,
	storage?: MinimalStorage | null
): RevenueShareClaim[] {
	const store = resolveStorage(storage);
	if (!keyId || !wallet || !store) return [];

	try {
		const raw = store.getItem(getRevenueShareClaimsStorageKey(keyId, wallet));
		if (!raw) return [];
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.filter(isValidClaim).sort((a, b) => b.claimedAt - a.claimedAt);
	} catch {
		return [];
	}
}

/**
 * Persists the claims a wallet made for a key.
 */
export function saveRevenueShareClaims(
	keyId: string,
	wallet: string | undefined,
	claims: readonly RevenueShareClaim[],
	storage?: MinimalStorage | null
): void {
	const store = resolveStorage(storage);
	if (!keyId || !wallet || !store) return;

	try {
		store.setItem(
			getRevenueShareClaimsStorageKey(keyId, wallet),
			JSON.stringify(claims)
		);
	} catch {
		// ignore persistence failure
	}
}

/**
 * Adds a claim to the recorded ones, replacing any earlier claim for the
 * same distribution.
 */
export function mergeRevenueShareClaim(
	claims: readonly RevenueShareClaim[],
	claim: RevenueShareClaim
): RevenueShareClaim[] {
	return [claim, ...claims.filter(existing => existing.distributionId !== claim.distributionId)];
}

/**
 * Applies locally recorded claims to the fetched distributions.
 *
 * The server stays the source of truth: a distribution it already reports as
 * claimed keeps the server's amount and date, and only the ones it still
 * reports as unclaimed are marked with the local claim.
 */
export function applyRevenueShareClaims(
	distributions: readonly RevenueShareDistribution[],
	claims: readonly RevenueShareClaim[]
): RevenueShareDistribution[] {
	return distributions.map(distribution => {
		if (distribution.claimed) return distribution;

		const claim = claims.find(
			entry => entry.distributionId === distribution.id
		);
		if (!claim) return distribution;

		return {
			...distribution,
			claimed: true,
			receivedAmount: claim.receivedAmount,
			claimedAt: claim.claimedAt,
		};
	});
}
