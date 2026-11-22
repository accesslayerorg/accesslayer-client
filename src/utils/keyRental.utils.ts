import type {
	ListableKey,
	RentalListing,
	RentalStatus,
	WalletRentalGroups,
} from '@/types/keyRental';
import {
	parseXlmInputToStroops,
	stroopsToXlmInput,
} from '@/utils/lpPositions.utils';

/**
 * Longest rental the client lets an owner offer, in days. The rental contract
 * remains the authority; this only keeps form input in a sensible range.
 */
export const MAX_RENTAL_DAYS = 365;

/** Why listed keys cannot be sold or transferred until the rental ends. */
export const RENTAL_ESCROW_REASON =
	'Listed keys are held in escrow by the rental contract, so they cannot be sold or transferred while they are listed or rented out.';

/** Phase of a rental at a point in time, derived from its status and clock. */
export type RentalPhase =
	/** Listed and waiting for a renter. */
	| 'available'
	/** Rented and not yet expired. */
	| 'active'
	/** Expired; `end_rental` returns the keys and refunds the collateral. */
	| 'expired'
	/** Expired and past the grace period; the owner may claim the collateral. */
	| 'overdue'
	/** Ended or collateral claimed. */
	| 'closed';

const STATUS_ALIASES: Record<string, RentalStatus> = {
	listed: 'listed',
	available: 'listed',
	open: 'listed',
	rented: 'rented',
	active: 'rented',
	ended: 'ended',
	returned: 'ended',
	collateral_claimed: 'collateral_claimed',
	claimed: 'collateral_claimed',
};

function sameAddress(
	a: string | null | undefined,
	b: string | null | undefined
) {
	if (!a || !b) return false;
	return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** Fee for renting `days` days: `feePerDay * days`, exact in stroops. */
export function calculateRentalFeeStroops(
	feePerDayStroops: bigint,
	days: number
): bigint {
	if (!Number.isInteger(days) || days <= 0) return 0n;
	return feePerDayStroops * BigInt(days);
}

export interface RentalCostBreakdown {
	/** Rental fee paid to the owner (fee per day times days). */
	feeStroops: bigint;
	/** Collateral locked until the rental ends. */
	collateralStroops: bigint;
	/** Amount the renter needs to cover the fee and the collateral. */
	totalDueStroops: bigint;
}

/** Fee, collateral and total due for renting a listing for `days` days. */
export function calculateRentalCost(
	listing: Pick<RentalListing, 'feePerDayStroops' | 'collateralStroops'>,
	days: number
): RentalCostBreakdown {
	const feeStroops = calculateRentalFeeStroops(listing.feePerDayStroops, days);
	return {
		feeStroops,
		collateralStroops: listing.collateralStroops,
		totalDueStroops: feeStroops + listing.collateralStroops,
	};
}

/**
 * Formats stroops as an exact XLM amount with thousands separators and no
 * rounding, e.g. `12345678901n` -> `"1,234.5678901"`.
 */
export function formatRentalXlm(stroops: bigint): string {
	const negative = stroops < 0n;
	const plain = stroopsToXlmInput(negative ? -stroops : stroops);
	const [whole, fraction] = plain.split('.');
	const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
	return `${negative ? '-' : ''}${grouped}${fraction ? `.${fraction}` : ''}`;
}

export interface ListRentalFormValues {
	quantity: string;
	feePerDay: string;
	maxDays: string;
	collateral: string;
}

export type ListRentalFormErrors = Partial<
	Record<keyof ListRentalFormValues, string>
>;

export interface ListRentalValidation {
	isValid: boolean;
	errors: ListRentalFormErrors;
	quantity: number;
	feePerDayStroops: bigint;
	maxDays: number;
	collateralStroops: bigint;
}

function parsePositiveInteger(input: string): number | null {
	const trimmed = input.trim();
	if (!/^\d+$/.test(trimmed)) return null;
	const value = Number(trimmed);
	return Number.isSafeInteger(value) && value > 0 ? value : null;
}

function parseXlmAmount(
	input: string,
	label: string,
	{ allowZero }: { allowZero: boolean }
): { stroops: bigint; error?: string } {
	if (input.trim() === '')
		return { stroops: 0n, error: `Enter the ${label}.` };
	const parsed = parseXlmInputToStroops(input);
	if (parsed === 'precision') {
		return {
			stroops: 0n,
			error: `Use at most 7 decimal places for the ${label}.`,
		};
	}
	if (parsed === null) {
		return { stroops: 0n, error: `Enter a valid ${label} in XLM.` };
	}
	if (!allowZero && parsed <= 0n) {
		return { stroops: 0n, error: `The ${label} must be greater than 0.` };
	}
	return { stroops: parsed };
}

/**
 * Validates the List keys form against the holder's available balance.
 *
 * `availableBalance` is the number of keys the holder can still list: keys
 * already escrowed by other listings are not part of it.
 */
export function validateListRental(
	values: ListRentalFormValues,
	availableBalance: number
): ListRentalValidation {
	const errors: ListRentalFormErrors = {};

	const quantity = parsePositiveInteger(values.quantity);
	if (quantity === null) {
		errors.quantity = 'Enter a whole number of keys, at least 1.';
	} else if (quantity > availableBalance) {
		errors.quantity =
			availableBalance <= 0
				? 'You have no keys available to list.'
				: `You can list at most ${availableBalance} key${availableBalance === 1 ? '' : 's'}.`;
	}

	const fee = parseXlmAmount(values.feePerDay, 'fee per day', {
		allowZero: false,
	});
	if (fee.error) errors.feePerDay = fee.error;

	const maxDays = parsePositiveInteger(values.maxDays);
	if (maxDays === null) {
		errors.maxDays = 'Enter a whole number of days, at least 1.';
	} else if (maxDays > MAX_RENTAL_DAYS) {
		errors.maxDays = `Rentals can last at most ${MAX_RENTAL_DAYS} days.`;
	}

	const collateral = parseXlmAmount(values.collateral, 'collateral', {
		allowZero: true,
	});
	if (collateral.error) errors.collateral = collateral.error;

	return {
		isValid: Object.keys(errors).length === 0,
		errors,
		quantity: quantity ?? 0,
		feePerDayStroops: fee.stroops,
		maxDays: maxDays ?? 0,
		collateralStroops: collateral.stroops,
	};
}

export interface RentDaysValidation {
	isValid: boolean;
	days: number;
	error?: string;
}

/** Validates the number of days chosen in the rent modal. */
export function validateRentDays(
	input: string,
	maxDays: number
): RentDaysValidation {
	const days = parsePositiveInteger(input);
	if (days === null) {
		return {
			isValid: false,
			days: 0,
			error: 'Enter a whole number of days, at least 1.',
		};
	}
	if (days > maxDays) {
		return {
			isValid: false,
			days,
			error: `This listing allows at most ${maxDays} day${maxDays === 1 ? '' : 's'}.`,
		};
	}
	return { isValid: true, days };
}

/** Phase of `listing` at `nowMs`. */
export function getRentalPhase(
	listing: Pick<RentalListing, 'status' | 'expiresAtMs' | 'graceEndsAtMs'>,
	nowMs: number
): RentalPhase {
	if (listing.status === 'ended' || listing.status === 'collateral_claimed') {
		return 'closed';
	}
	if (listing.status === 'listed') return 'available';
	if (listing.expiresAtMs == null || nowMs < listing.expiresAtMs) {
		return 'active';
	}
	if (listing.graceEndsAtMs != null && nowMs >= listing.graceEndsAtMs) {
		return 'overdue';
	}
	return 'expired';
}

/**
 * Whether `end_rental` can be called: only once the rental has expired and
 * before it is closed. It returns the keys to the owner and the collateral to
 * the renter.
 */
export function canEndRental(
	listing: Pick<RentalListing, 'status' | 'expiresAtMs' | 'graceEndsAtMs'>,
	nowMs: number
): boolean {
	const phase = getRentalPhase(listing, nowMs);
	return phase === 'expired' || phase === 'overdue';
}

/**
 * Whether `wallet` can claim the collateral: only the owner, and only after
 * the grace period has passed without the rental being ended.
 */
export function canClaimCollateral(
	listing: Pick<
		RentalListing,
		'owner' | 'status' | 'expiresAtMs' | 'graceEndsAtMs'
	>,
	wallet: string | null | undefined,
	nowMs: number
): boolean {
	return (
		sameAddress(listing.owner, wallet) &&
		getRentalPhase(listing, nowMs) === 'overdue'
	);
}

/** Whole seconds until the rental expires, never negative. */
export function getRentalRemainingSeconds(
	expiresAtMs: number | null,
	nowMs: number
): number {
	if (expiresAtMs == null) return 0;
	const remaining = expiresAtMs - nowMs;
	return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

/** Splits a wallet's rentals into the My Rentals tabs. Closed rentals are dropped. */
export function groupWalletRentals(
	listings: RentalListing[],
	wallet: string | null | undefined
): WalletRentalGroups {
	const groups: WalletRentalGroups = {
		listed: [],
		rentedOut: [],
		rentedIn: [],
	};
	if (!wallet) return groups;

	for (const listing of listings) {
		if (listing.status === 'listed' && sameAddress(listing.owner, wallet)) {
			groups.listed.push(listing);
		} else if (listing.status === 'rented') {
			if (sameAddress(listing.owner, wallet)) groups.rentedOut.push(listing);
			else if (sameAddress(listing.renter, wallet))
				groups.rentedIn.push(listing);
		}
	}
	return groups;
}

/**
 * Keys of `keyId` the wallet has escrowed in the rental contract, listed or
 * rented out. These keys cannot be sold or transferred until the rental ends.
 */
export function getEscrowedKeyQuantity(
	listings: RentalListing[],
	wallet: string | null | undefined,
	keyId: string
): number {
	if (!wallet) return 0;
	return listings.reduce(
		(total, listing) =>
			listing.keyId === keyId &&
			sameAddress(listing.owner, wallet) &&
			(listing.status === 'listed' || listing.status === 'rented')
				? total + listing.quantity
				: total,
		0
	);
}

/** Minimal holding shape needed to work out what can be listed. */
export interface RentalHoldingSource {
	creatorId: string;
	quantity?: number | null;
	liquidQuantity?: number | null;
}

/**
 * Keys the wallet can list for rent: each held key's liquid balance (frozen
 * keys excluded) minus keys already escrowed by its open listings. Keys with
 * nothing left to list are dropped.
 */
export function buildListableKeys(
	holdings: RentalHoldingSource[],
	keyNames: Record<string, string>,
	rentals: RentalListing[],
	wallet: string | null | undefined
): ListableKey[] {
	return holdings
		.map(holding => {
			const liquid = holding.liquidQuantity ?? holding.quantity ?? 0;
			const escrowed = getEscrowedKeyQuantity(
				rentals,
				wallet,
				holding.creatorId
			);
			return {
				keyId: holding.creatorId,
				keyName: keyNames[holding.creatorId] ?? holding.creatorId,
				availableBalance: Math.max(0, Math.floor(liquid) - escrowed),
			};
		})
		.filter(key => key.availableBalance > 0);
}

function pick(raw: Record<string, unknown>, ...keys: string[]): unknown {
	for (const key of keys) {
		if (raw[key] !== undefined && raw[key] !== null) return raw[key];
	}
	return undefined;
}

function toStroops(
	raw: Record<string, unknown>,
	stroopKeys: string[],
	xlmKeys: string[]
): bigint {
	const stroops = pick(raw, ...stroopKeys);
	if (typeof stroops === 'bigint') return stroops;
	if (
		(typeof stroops === 'number' && Number.isSafeInteger(stroops)) ||
		(typeof stroops === 'string' && /^-?\d+$/.test(stroops.trim()))
	) {
		return BigInt(String(stroops).trim());
	}
	const xlm = pick(raw, ...xlmKeys);
	if (typeof xlm === 'number' || typeof xlm === 'string') {
		const parsed = parseXlmInputToStroops(String(xlm));
		if (typeof parsed === 'bigint') return parsed;
	}
	return 0n;
}

/** Accepts seconds, milliseconds, numeric strings or ISO dates. */
function toMs(value: unknown): number | null {
	if (value == null || value === '') return null;
	if (typeof value === 'number' || /^\d+$/.test(String(value).trim())) {
		const n = Number(value);
		if (!Number.isFinite(n) || n <= 0) return null;
		return n < 1e12 ? n * 1000 : n;
	}
	const parsed = Date.parse(String(value));
	return Number.isNaN(parsed) ? null : parsed;
}

function toCount(value: unknown): number | null {
	const n = Number(value);
	return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
}

/**
 * Normalizes a rental listing from the API, accepting camelCase, snake_case
 * and contract field names. Returns null when it has no id or key.
 */
export function normalizeRentalListing(raw: unknown): RentalListing | null {
	if (!raw || typeof raw !== 'object') return null;
	const r = raw as Record<string, unknown>;

	const id = pick(r, 'id', 'listingId', 'listing_id');
	const keyId = pick(r, 'keyId', 'key_id', 'creatorId', 'creator_id');
	if (id == null || keyId == null) return null;

	const statusRaw = String(pick(r, 'status') ?? 'listed')
		.trim()
		.toLowerCase();
	const renter = pick(r, 'renter', 'renterAddress', 'renter_address');

	return {
		id: String(id),
		keyId: String(keyId),
		keyName: String(pick(r, 'keyName', 'key_name', 'creatorName') ?? keyId),
		owner: String(pick(r, 'owner', 'ownerAddress', 'owner_address') ?? ''),
		quantity: toCount(pick(r, 'quantity')) ?? 0,
		feePerDayStroops: toStroops(
			r,
			['feePerDayStroops', 'fee_per_day_stroops', 'fee_per_day'],
			['feePerDayXlm', 'fee_per_day_xlm']
		),
		maxDays: toCount(pick(r, 'maxDays', 'max_days')) ?? 0,
		collateralStroops: toStroops(
			r,
			['collateralStroops', 'collateral_stroops', 'collateral'],
			['collateralXlm', 'collateral_xlm']
		),
		status: STATUS_ALIASES[statusRaw] ?? 'listed',
		renter: renter == null || renter === '' ? null : String(renter),
		rentedDays: toCount(pick(r, 'rentedDays', 'rented_days', 'days')),
		rentedAtMs: toMs(
			pick(r, 'rentedAt', 'rented_at', 'startedAt', 'started_at')
		),
		expiresAtMs: toMs(pick(r, 'expiresAt', 'expires_at', 'expiry')),
		graceEndsAtMs: toMs(
			pick(
				r,
				'graceEndsAt',
				'grace_ends_at',
				'graceDeadline',
				'grace_deadline'
			)
		),
	};
}
