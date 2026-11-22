/**
 * Key rentals (#1360): holders list creator keys for a daily fee, renters pay
 * for a number of days and receive usage rights such as gated content access.
 *
 * The client follows the rental contract interface from
 * accesslayer-contracts#1227 (`list_rental`, `rent`, `is_active_renter`,
 * `end_rental`, `claim_collateral`). Amounts are kept in stroops (bigint) so
 * fee totals are exact.
 */

/** Lifecycle status recorded for a rental listing. */
export type RentalStatus = 'listed' | 'rented' | 'ended' | 'collateral_claimed';

/** A rental listing as indexed from the contract's rental events. */
export interface RentalListing {
	/** On-chain listing id passed to `rent`, `end_rental` and `claim_collateral`. */
	id: string;
	/** Creator key the listing escrows. */
	keyId: string;
	/** Display name of the creator key. */
	keyName: string;
	/** Wallet that listed the keys and receives the fee. */
	owner: string;
	/** Number of keys escrowed by the listing. */
	quantity: number;
	/** Fee charged per rented day, in stroops. */
	feePerDayStroops: bigint;
	/** Longest rental the owner accepts, in days. */
	maxDays: number;
	/** Collateral the renter locks for the rental, in stroops. */
	collateralStroops: bigint;
	status: RentalStatus;
	/** Renter wallet while rented, otherwise null. */
	renter: string | null;
	/** Days paid for by the current renter. */
	rentedDays: number | null;
	/** When the current rental started (ms since epoch). */
	rentedAtMs: number | null;
	/** When the current rental expires (ms since epoch). */
	expiresAtMs: number | null;
	/**
	 * When the grace period ends (ms since epoch). After this the owner may
	 * claim the collateral if the renter has not ended the rental.
	 */
	graceEndsAtMs: number | null;
}

/** A wallet's rentals split into the My Rentals tabs. */
export interface WalletRentalGroups {
	/** Owned by the wallet and waiting for a renter. */
	listed: RentalListing[];
	/** Owned by the wallet and currently rented by someone else. */
	rentedOut: RentalListing[];
	/** Rented by the wallet from someone else. */
	rentedIn: RentalListing[];
}

/** A key the holder can list, with the balance still available to list. */
export interface ListableKey {
	keyId: string;
	keyName: string;
	/** Held keys that are not frozen or already escrowed by a listing. */
	availableBalance: number;
}

export interface ListRentalInput {
	keyId: string;
	quantity: number;
	feePerDayStroops: bigint;
	maxDays: number;
	collateralStroops: bigint;
}

export interface RentKeyInput {
	listingId: string;
	days: number;
}
