import { describe, expect, it } from 'vitest';
import {
	canCancelBundle,
	computeBundleListPriceXlm,
	describeBundleEndReason,
	getBundleDiscountBps,
	getBundlePriceFloorXlm,
	getBundleQuantityTotal,
	getBundleStatus,
	getBundleTimeRemainingState,
	isBundleExpired,
	partitionBundlesByStatus,
	resolveBundleExpiryIso,
	validateBundleDraft,
	BUNDLE_MAX_EXPIRY_DAYS,
	BUNDLE_MIN_DISCOUNT_BPS,
	type BundleKeyOption,
} from '@/utils/bundle.utils';
import type { KeyBundle } from '@/services/bundle.service';

const NOW_MS = Date.parse('2026-01-01T00:00:00.000Z');
const DAY_MS = 86_400_000;

function makeBundle(overrides: Partial<KeyBundle> = {}): KeyBundle {
	return {
		id: 'bundle-1',
		creatorId: 'creator-1',
		items: [{ keyId: 'key-a', quantity: 2 }],
		listPriceXlm: 20,
		discountPriceXlm: 16,
		expiresAt: new Date(NOW_MS + 2 * DAY_MS).toISOString(),
		createdAt: new Date(NOW_MS - DAY_MS).toISOString(),
		purchaseCount: 0,
		cancelledAt: null,
		...overrides,
	};
}

describe('bundle quantity + list price', () => {
	it('sums quantities across every line item', () => {
		expect(
			getBundleQuantityTotal([
				{ keyId: 'key-a', quantity: 2 },
				{ keyId: 'key-b', quantity: 5 },
			])
		).toBe(7);
	});

	it('ignores non-finite quantities instead of returning NaN', () => {
		expect(
			getBundleQuantityTotal([{ keyId: 'key-a', quantity: Number.NaN }])
		).toBe(0);
	});

	it('multiplies each line by its key list price', () => {
		expect(
			computeBundleListPriceXlm(
				[
					{ keyId: 'key-a', quantity: 2 },
					{ keyId: 'key-b', quantity: 1 },
				],
				{ 'key-a': 10, 'key-b': 4 }
			)
		).toBe(24);
	});

	it('skips keys with a missing price rather than producing NaN', () => {
		expect(
			computeBundleListPriceXlm(
				[
					{ keyId: 'key-a', quantity: 2 },
					{ keyId: 'key-missing', quantity: 3 },
				],
				{ 'key-a': 10 }
			)
		).toBe(20);
	});
});

describe('bundle price floor', () => {
	it('allows a 20% discount off the list price', () => {
		expect(BUNDLE_MIN_DISCOUNT_BPS).toBe(2_000);
		expect(getBundlePriceFloorXlm(100)).toBe(80);
	});

	it('returns 0 when the list price is unknown', () => {
		expect(getBundlePriceFloorXlm(0)).toBe(0);
		expect(getBundlePriceFloorXlm(Number.NaN)).toBe(0);
	});

	it('reports the discount in basis points', () => {
		expect(getBundleDiscountBps(100, 80)).toBe(2_000);
		expect(getBundleDiscountBps(100, 75)).toBe(2_500);
	});

	it('reports no discount when the price is not below list', () => {
		expect(getBundleDiscountBps(100, 100)).toBe(0);
		expect(getBundleDiscountBps(100, 120)).toBe(0);
		expect(getBundleDiscountBps(0, 5)).toBe(0);
	});
});

describe('validateBundleDraft', () => {
	const items = [{ keyId: 'key-a', quantity: 1 }];

	it('accepts a price exactly at the floor', () => {
		const result = validateBundleDraft(items, '80', '14', 100);
		expect(result.isValid).toBe(true);
		expect(result.priceError).toBeNull();
	});

	it('rejects a price below the floor', () => {
		const result = validateBundleDraft(items, '79.99', '14', 100);
		expect(result.isValid).toBe(false);
		expect(result.priceError).toBe('Bundle price must be at least 80 XLM (20% off list)');
	});

	it('rejects a price that is not actually a discount', () => {
		const atList = validateBundleDraft(items, '100', '14', 100);
		expect(atList.priceError).toBe(
			'Bundle price must be below the 100 XLM list price'
		);

		const aboveList = validateBundleDraft(items, '120', '14', 100);
		expect(aboveList.priceError).toBe(
			'Bundle price must be below the 100 XLM list price'
		);
	});

	it.each(['', '   ', '0', '-5', 'abc'])(
		'rejects %o as a bundle price',
		raw => {
			const result = validateBundleDraft(items, raw, '14', 100);
			expect(result.isValid).toBe(false);
			expect(result.priceError).toBe('Enter a bundle price greater than 0');
		}
	);

	it('requires at least one key with a whole quantity', () => {
		expect(validateBundleDraft([], '80', '14', 100).itemsError).toBe(
			'Add at least one key to the bundle'
		);

		expect(
			validateBundleDraft([{ keyId: 'key-a', quantity: 0 }], '80', '14', 100)
				.itemsError
		).toBe('Quantities must be whole numbers greater than 0');

		expect(
			validateBundleDraft([{ keyId: 'key-a', quantity: 1.5 }], '80', '14', 100)
				.itemsError
		).toBe('Quantities must be whole numbers greater than 0');
	});

	it('rejects the same key added twice', () => {
		const result = validateBundleDraft(
			[
				{ keyId: 'key-a', quantity: 1 },
				{ keyId: 'key-a', quantity: 2 },
			],
			'80',
			'14',
			100
		);
		expect(result.itemsError).toBe('A key can only be added once');
	});

	it('rejects an expiry outside the supported window', () => {
		expect(validateBundleDraft(items, '80', '0', 100).expiryError).toBe(
			'Bundle expiry must be at least 1 day'
		);
		expect(
			validateBundleDraft(items, '80', String(BUNDLE_MAX_EXPIRY_DAYS + 1), 100)
				.expiryError
		).toBe(`Bundle expiry cannot exceed ${BUNDLE_MAX_EXPIRY_DAYS} days`);
		expect(validateBundleDraft(items, '80', '1.5', 100).expiryError).toBe(
			'Enter a whole number of days'
		);
		expect(validateBundleDraft(items, '80', '', 100).expiryError).toBe(
			'Enter a bundle expiry in days'
		);
		expect(validateBundleDraft(items, '80', '14', 100).expiryError).toBeNull();
	});

	it('reports every field error at once', () => {
		const result = validateBundleDraft([], '1', '0', 0);
		expect(result.itemsError).not.toBeNull();
		expect(result.expiryError).not.toBeNull();
		expect(result.priceError).not.toBeNull();
		expect(result.isValid).toBe(false);
	});
});

describe('bundle expiry + status', () => {
	it('treats a bundle as expired once the clock reaches its expiry', () => {
		const bundle = makeBundle({
			expiresAt: new Date(NOW_MS).toISOString(),
		});
		expect(isBundleExpired(bundle, NOW_MS - 1)).toBe(false);
		expect(isBundleExpired(bundle, NOW_MS)).toBe(true);
		expect(getBundleStatus(bundle, NOW_MS)).toBe('expired');
	});

	it('keeps a future bundle active and cancellable', () => {
		const bundle = makeBundle();
		expect(getBundleStatus(bundle, NOW_MS)).toBe('active');
		expect(canCancelBundle(bundle, NOW_MS)).toBe(true);
	});

	it('never reports an unparseable expiry as expired', () => {
		const bundle = makeBundle({ expiresAt: 'not-a-date' });
		expect(isBundleExpired(bundle, NOW_MS)).toBe(false);
		expect(getBundleStatus(bundle, NOW_MS)).toBe('active');
	});

	it('lets a cancellation win over expiry', () => {
		const bundle = makeBundle({
			expiresAt: new Date(NOW_MS - DAY_MS).toISOString(),
			cancelledAt: new Date(NOW_MS - 2 * DAY_MS).toISOString(),
		});
		expect(getBundleStatus(bundle, NOW_MS)).toBe('cancelled');
		expect(canCancelBundle(bundle, NOW_MS)).toBe(false);
		expect(describeBundleEndReason(bundle, NOW_MS)).toBe('Cancelled by creator');
	});

	it('describes why a bundle ended', () => {
		expect(
			describeBundleEndReason(
				makeBundle({ expiresAt: new Date(NOW_MS - 1).toISOString() }),
				NOW_MS
			)
		).toBe('Expired');
		expect(describeBundleEndReason(makeBundle(), NOW_MS)).toBe('Active');
	});
});

describe('getBundleTimeRemainingState', () => {
	it('reports a live countdown for a future expiry', () => {
		const expiresAt = new Date(NOW_MS + 2 * DAY_MS).toISOString();
		expect(getBundleTimeRemainingState(expiresAt, NOW_MS)).toEqual({
			isExpired: false,
			label: '2d 0h 0m 0s',
		});
	});

	it('reports the bundle as expired at and after the expiry', () => {
		const expiresAt = new Date(NOW_MS).toISOString();
		expect(getBundleTimeRemainingState(expiresAt, NOW_MS)).toEqual({
			isExpired: true,
			label: 'Expired',
		});
		expect(
			getBundleTimeRemainingState(expiresAt, NOW_MS + DAY_MS)
		).toMatchObject({ isExpired: true, label: 'Expired' });
	});

	it('falls back to a placeholder for a missing expiry', () => {
		expect(getBundleTimeRemainingState(null, NOW_MS)).toEqual({
			isExpired: false,
			label: '—',
		});
		expect(getBundleTimeRemainingState('nope', NOW_MS)).toEqual({
			isExpired: false,
			label: '—',
		});
	});
});

describe('partitionBundlesByStatus', () => {
	const live = makeBundle({
		id: 'live',
		expiresAt: new Date(NOW_MS + DAY_MS).toISOString(),
	});
	const liveSoon = makeBundle({
		id: 'live-soon',
		expiresAt: new Date(NOW_MS + 1_000).toISOString(),
	});
	const expired = makeBundle({
		id: 'expired',
		expiresAt: new Date(NOW_MS - 2 * DAY_MS).toISOString(),
	});
	const cancelled = makeBundle({
		id: 'cancelled',
		expiresAt: new Date(NOW_MS - DAY_MS).toISOString(),
		cancelledAt: new Date(NOW_MS - DAY_MS).toISOString(),
	});

	it('splits live bundles from expired and cancelled ones', () => {
		const { active, archived } = partitionBundlesByStatus(
			[live, expired, cancelled],
			NOW_MS
		);
		expect(active.map(b => b.id)).toEqual(['live']);
		expect(archived.map(b => b.id).sort()).toEqual(['cancelled', 'expired']);
	});

	it('moves a bundle to the archive as soon as it lapses', () => {
		const before = partitionBundlesByStatus([liveSoon], NOW_MS - 2_000);
		expect(before.active).toHaveLength(1);
		expect(before.archived).toHaveLength(0);

		const after = partitionBundlesByStatus([liveSoon], NOW_MS + 2_000);
		expect(after.active).toHaveLength(0);
		expect(after.archived.map(b => b.id)).toEqual(['live-soon']);
	});

	it('orders the active list soonest-expiry first and the archive newest-end first', () => {
		const { active, archived } = partitionBundlesByStatus(
			[live, liveSoon, expired, cancelled],
			NOW_MS
		);
		expect(active.map(b => b.id)).toEqual(['live-soon', 'live']);
		expect(archived.map(b => b.id)).toEqual(['cancelled', 'expired']);
	});
});

describe('resolveBundleExpiryIso', () => {
	it('turns a day count into an absolute ISO expiry', () => {
		expect(resolveBundleExpiryIso(14, NOW_MS)).toBe('2026-01-15T00:00:00.000Z');
		expect(resolveBundleExpiryIso(1, NOW_MS)).toBe('2026-01-02T00:00:00.000Z');
	});
});

describe('BundleKeyOption', () => {
	it('carries the id, title and list price the create form needs', () => {
		const option: BundleKeyOption = {
			id: 'key-a',
			title: 'Alpha Key',
			priceXlm: 10,
		};
		expect(computeBundleListPriceXlm([{ keyId: option.id, quantity: 2 }], {
			[option.id]: option.priceXlm,
		})).toBe(20);
	});
});
