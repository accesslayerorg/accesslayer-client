import { describe, expect, it } from 'vitest';
import type { RentalListing } from '@/types/keyRental';
import {
	buildListableKeys,
	calculateRentalCost,
	calculateRentalFeeStroops,
	canClaimCollateral,
	canEndRental,
	formatRentalXlm,
	getEscrowedKeyQuantity,
	getRentalPhase,
	getRentalRemainingSeconds,
	groupWalletRentals,
	MAX_RENTAL_DAYS,
	normalizeRentalListing,
	validateListRental,
	validateRentDays,
} from '../keyRental.utils';

const OWNER = 'GOWNER0000000000000000000000000000000000000000000000000';
const RENTER = 'GRENTER000000000000000000000000000000000000000000000000';
const DAY_MS = 86_400_000;
const NOW = 1_800_000_000_000;

function listing(overrides: Partial<RentalListing> = {}): RentalListing {
	return {
		id: '1',
		keyId: 'key-a',
		keyName: 'Alpha',
		owner: OWNER,
		quantity: 2,
		feePerDayStroops: 5_000_000n,
		maxDays: 30,
		collateralStroops: 100_000_000n,
		status: 'listed',
		renter: null,
		rentedDays: null,
		rentedAtMs: null,
		expiresAtMs: null,
		graceEndsAtMs: null,
		...overrides,
	};
}

function rented(overrides: Partial<RentalListing> = {}): RentalListing {
	return listing({
		status: 'rented',
		renter: RENTER,
		rentedDays: 3,
		rentedAtMs: NOW - 3 * DAY_MS,
		expiresAtMs: NOW + DAY_MS,
		graceEndsAtMs: NOW + 2 * DAY_MS,
		...overrides,
	});
}

describe('rental cost', () => {
	it('charges exactly fee per day times days, in stroops', () => {
		expect(calculateRentalFeeStroops(5_000_000n, 7)).toBe(35_000_000n);
		// 0.1234567 XLM a day for 365 days, with no floating point drift.
		expect(calculateRentalFeeStroops(1_234_567n, 365)).toBe(450_616_955n);
	});

	it('returns zero for invalid day counts', () => {
		expect(calculateRentalFeeStroops(5_000_000n, 0)).toBe(0n);
		expect(calculateRentalFeeStroops(5_000_000n, 1.5)).toBe(0n);
	});

	it('adds the collateral to the total due', () => {
		expect(calculateRentalCost(listing(), 4)).toEqual({
			feeStroops: 20_000_000n,
			collateralStroops: 100_000_000n,
			totalDueStroops: 120_000_000n,
		});
	});

	it('formats stroops exactly with grouping', () => {
		expect(formatRentalXlm(12_345_678_901n)).toBe('1,234.5678901');
		expect(formatRentalXlm(5_000_000n)).toBe('0.5');
		expect(formatRentalXlm(0n)).toBe('0');
	});
});

describe('validateListRental', () => {
	const valid = {
		quantity: '2',
		feePerDay: '0.5',
		maxDays: '30',
		collateral: '10',
	};

	it('accepts a listing within the available balance', () => {
		const result = validateListRental(valid, 2);
		expect(result.isValid).toBe(true);
		expect(result).toMatchObject({
			quantity: 2,
			feePerDayStroops: 5_000_000n,
			maxDays: 30,
			collateralStroops: 100_000_000n,
		});
	});

	it('rejects a quantity above the available balance', () => {
		const result = validateListRental({ ...valid, quantity: '3' }, 2);
		expect(result.isValid).toBe(false);
		expect(result.errors.quantity).toBe('You can list at most 2 keys.');
	});

	it('explains when nothing is available to list', () => {
		expect(validateListRental(valid, 0).errors.quantity).toBe(
			'You have no keys available to list.'
		);
	});

	it('rejects fractional quantities, zero fees and too many days', () => {
		const result = validateListRental(
			{
				quantity: '1.5',
				feePerDay: '0',
				maxDays: String(MAX_RENTAL_DAYS + 1),
				collateral: '',
			},
			5
		);
		expect(result.errors).toEqual({
			quantity: 'Enter a whole number of keys, at least 1.',
			feePerDay: 'The fee per day must be greater than 0.',
			maxDays: `Rentals can last at most ${MAX_RENTAL_DAYS} days.`,
			collateral: 'Enter the collateral.',
		});
	});

	it('rejects more than 7 decimal places and allows zero collateral', () => {
		const result = validateListRental(
			{ ...valid, feePerDay: '0.12345678', collateral: '0' },
			2
		);
		expect(result.errors).toEqual({
			feePerDay: 'Use at most 7 decimal places for the fee per day.',
		});
		expect(result.collateralStroops).toBe(0n);
	});
});

describe('validateRentDays', () => {
	it('accepts days within the listing maximum', () => {
		expect(validateRentDays('30', 30)).toEqual({ isValid: true, days: 30 });
	});

	it('rejects days above the maximum, zero and fractions', () => {
		expect(validateRentDays('31', 30).error).toBe(
			'This listing allows at most 30 days.'
		);
		expect(validateRentDays('0', 30).isValid).toBe(false);
		expect(validateRentDays('2.5', 30).isValid).toBe(false);
	});
});

describe('rental phases and eligibility', () => {
	it('moves from active to expired to overdue to closed', () => {
		const item = rented();
		expect(getRentalPhase(listing(), NOW)).toBe('available');
		expect(getRentalPhase(item, NOW)).toBe('active');
		expect(getRentalPhase(item, NOW + DAY_MS)).toBe('expired');
		expect(getRentalPhase(item, NOW + 2 * DAY_MS)).toBe('overdue');
		expect(getRentalPhase({ ...item, status: 'ended' }, NOW)).toBe('closed');
	});

	it('offers End rental only after expiry and before the rental is closed', () => {
		const item = rented();
		expect(canEndRental(listing(), NOW)).toBe(false);
		expect(canEndRental(item, NOW)).toBe(false);
		expect(canEndRental(item, NOW + DAY_MS)).toBe(true);
		expect(canEndRental(item, NOW + 3 * DAY_MS)).toBe(true);
		expect(
			canEndRental(
				{ ...item, status: 'collateral_claimed' },
				NOW + 3 * DAY_MS
			)
		).toBe(false);
	});

	it('offers Claim collateral only to the owner after the grace period', () => {
		const item = rented();
		expect(canClaimCollateral(item, OWNER, NOW + DAY_MS)).toBe(false);
		expect(canClaimCollateral(item, OWNER, NOW + 2 * DAY_MS)).toBe(true);
		expect(
			canClaimCollateral(item, OWNER.toLowerCase(), NOW + 2 * DAY_MS)
		).toBe(true);
		expect(canClaimCollateral(item, RENTER, NOW + 2 * DAY_MS)).toBe(false);
		expect(
			canClaimCollateral(
				{ ...item, status: 'ended' },
				OWNER,
				NOW + 3 * DAY_MS
			)
		).toBe(false);
	});

	it('never offers end or claim when the expiry is unknown', () => {
		const item = rented({ expiresAtMs: null, graceEndsAtMs: null });
		expect(canEndRental(item, NOW + 10 * DAY_MS)).toBe(false);
		expect(canClaimCollateral(item, OWNER, NOW + 10 * DAY_MS)).toBe(false);
	});

	it('counts down the remaining seconds and stops at zero', () => {
		expect(getRentalRemainingSeconds(NOW + 90_500, NOW)).toBe(91);
		expect(getRentalRemainingSeconds(NOW - 1, NOW)).toBe(0);
		expect(getRentalRemainingSeconds(null, NOW)).toBe(0);
	});
});

describe('wallet rental grouping and escrow', () => {
	const rentals = [
		listing({ id: '1' }),
		rented({ id: '2' }),
		rented({ id: '3', owner: 'GOTHER', renter: OWNER }),
		listing({ id: '4', status: 'ended' }),
		listing({ id: '5', keyId: 'key-b', quantity: 4 }),
	];

	it('splits listed, rented out and rented in, dropping closed rentals', () => {
		const groups = groupWalletRentals(rentals, OWNER);
		expect(groups.listed.map(r => r.id)).toEqual(['1', '5']);
		expect(groups.rentedOut.map(r => r.id)).toEqual(['2']);
		expect(groups.rentedIn.map(r => r.id)).toEqual(['3']);
	});

	it('returns empty groups without a wallet', () => {
		expect(groupWalletRentals(rentals, '')).toEqual({
			listed: [],
			rentedOut: [],
			rentedIn: [],
		});
	});

	it('counts keys escrowed by open listings and rentals the wallet owns', () => {
		expect(getEscrowedKeyQuantity(rentals, OWNER, 'key-a')).toBe(4);
		expect(getEscrowedKeyQuantity(rentals, OWNER, 'key-b')).toBe(4);
		expect(getEscrowedKeyQuantity(rentals, RENTER, 'key-a')).toBe(0);
	});

	it('only offers keys with balance left after escrow and freezes', () => {
		const keys = buildListableKeys(
			[
				{ creatorId: 'key-a', quantity: 10, liquidQuantity: 5 },
				{ creatorId: 'key-b', quantity: 4 },
				{ creatorId: 'key-c', quantity: 1 },
			],
			{ 'key-a': 'Alpha' },
			rentals,
			OWNER
		);
		expect(keys).toEqual([
			{ keyId: 'key-a', keyName: 'Alpha', availableBalance: 1 },
			{ keyId: 'key-c', keyName: 'key-c', availableBalance: 1 },
		]);
	});
});

describe('normalizeRentalListing', () => {
	it('reads contract-style snake_case fields with stroop amounts and seconds', () => {
		expect(
			normalizeRentalListing({
				listing_id: 7,
				key_id: 'key-a',
				owner: OWNER,
				quantity: '3',
				fee_per_day: '5000000',
				max_days: 14,
				collateral: 100_000_000,
				status: 'active',
				renter: RENTER,
				expires_at: 1_800_000_000,
				grace_ends_at: '2026-01-01T00:00:00.000Z',
			})
		).toMatchObject({
			id: '7',
			keyId: 'key-a',
			keyName: 'key-a',
			quantity: 3,
			feePerDayStroops: 5_000_000n,
			maxDays: 14,
			collateralStroops: 100_000_000n,
			status: 'rented',
			renter: RENTER,
			expiresAtMs: 1_800_000_000_000,
			graceEndsAtMs: Date.parse('2026-01-01T00:00:00.000Z'),
		});
	});

	it('falls back to XLM amounts and camelCase names', () => {
		expect(
			normalizeRentalListing({
				id: 'abc',
				keyId: 'key-b',
				keyName: 'Beta',
				feePerDayXlm: 0.25,
				collateralXlm: '12.5',
			})
		).toMatchObject({
			keyName: 'Beta',
			feePerDayStroops: 2_500_000n,
			collateralStroops: 125_000_000n,
			status: 'listed',
			renter: null,
		});
	});

	it('drops entries without an id or key', () => {
		expect(normalizeRentalListing({ keyId: 'key-a' })).toBeNull();
		expect(normalizeRentalListing({ id: '1' })).toBeNull();
		expect(normalizeRentalListing(null)).toBeNull();
	});
});
