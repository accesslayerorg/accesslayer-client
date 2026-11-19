/**
 * Key bundle helpers for the creator bundle management page.
 *
 * A bundle is a creator-defined set of keys sold together at a discount for a
 * limited window. Everything here is pure so the create form, the active list
 * and the archive all derive their state from the same rules:
 *
 * - the **price floor** is the cheapest a bundle may be priced, derived from
 *   the list price of its line items,
 * - **expiry** is compared against an injected `nowMs` so a bundle archives
 *   itself the moment it lapses, with no refetch.
 */

import type { BundleLineItem, BundleStatus, KeyBundle } from '@/services/bundle.service';
// Reuses the shared duration formatter; the countdown shape it produces
// ("2d 4h 13m 5s") is what bundle rows render.
import { formatDropTimeRemaining } from '@/utils/dropCountdown.utils';

const MS_PER_DAY = 86_400_000;
const BPS_DENOMINATOR = 10_000;

/** Minimum discount a bundle must offer, in basis points (2,000 = 20% off). */
export const BUNDLE_MIN_DISCOUNT_BPS = 2_000;

/** Shortest expiry a creator may configure, in days. */
export const BUNDLE_MIN_EXPIRY_DAYS = 1;

/** Longest expiry a creator may configure, in days. */
export const BUNDLE_MAX_EXPIRY_DAYS = 90;

/** Default expiry offered by the create form, in days. */
export const BUNDLE_DEFAULT_EXPIRY_DAYS = 14;

/** A key the creator can add to a bundle, with its list price in XLM. */
export interface BundleKeyOption {
	id: string;
	title: string;
	/** Undiscounted price of a single unit, in XLM. */
	priceXlm: number;
}

/** Total number of keys across every line item. */
export function getBundleQuantityTotal(items: BundleLineItem[]): number {
	return items.reduce(
		(total, item) => total + (Number.isFinite(item.quantity) ? item.quantity : 0),
		0
	);
}

/**
 * Undiscounted total of a bundle's line items, given the list price of each
 * key. Quantities and prices that are missing or non-finite contribute zero so
 * a partially-loaded price map can never produce `NaN`.
 */
export function computeBundleListPriceXlm(
	items: BundleLineItem[],
	priceByKeyIdXlm: Record<string, number | null | undefined>
): number {
	return items.reduce((total, item) => {
		const unitPrice = priceByKeyIdXlm[item.keyId];
		const quantity = Number(item.quantity);
		if (!Number.isFinite(unitPrice) || !Number.isFinite(quantity)) return total;
		return total + (unitPrice as number) * quantity;
	}, 0);
}

/**
 * Cheapest price a bundle may be listed at: the list price minus the minimum
 * required discount. Returns 0 when the list price is unknown.
 */
export function getBundlePriceFloorXlm(listPriceXlm: number): number {
	if (!Number.isFinite(listPriceXlm) || listPriceXlm <= 0) return 0;
	return (listPriceXlm * (BPS_DENOMINATOR - BUNDLE_MIN_DISCOUNT_BPS)) / BPS_DENOMINATOR;
}

/** Discount a bundle price represents, in basis points (0 when not discounted). */
export function getBundleDiscountBps(
	listPriceXlm: number,
	discountPriceXlm: number
): number {
	if (!Number.isFinite(listPriceXlm) || listPriceXlm <= 0) return 0;
	if (!Number.isFinite(discountPriceXlm) || discountPriceXlm <= 0) return 0;
	if (discountPriceXlm >= listPriceXlm) return 0;
	return Math.round(
		((listPriceXlm - discountPriceXlm) / listPriceXlm) * BPS_DENOMINATOR
	);
}

/** Resolves a bundle's `expiresAt` to epoch milliseconds, or null if unparseable. */
export function resolveBundleExpiryMs(bundle: Pick<KeyBundle, 'expiresAt'>): number | null {
	const parsed = new Date(bundle.expiresAt).getTime();
	return Number.isNaN(parsed) ? null : parsed;
}

/** A bundle is expired once the current time reaches its expiry. */
export function isBundleExpired(
	bundle: Pick<KeyBundle, 'expiresAt'>,
	nowMs: number
): boolean {
	const expiryMs = resolveBundleExpiryMs(bundle);
	if (expiryMs == null) return false;
	return nowMs >= expiryMs;
}

/**
 * Lifecycle status of a bundle. A creator cancellation wins over expiry so a
 * cancelled bundle never reappears as merely expired.
 */
export function getBundleStatus(
	bundle: Pick<KeyBundle, 'expiresAt' | 'cancelledAt'>,
	nowMs: number
): BundleStatus {
	if (bundle.cancelledAt) return 'cancelled';
	return isBundleExpired(bundle, nowMs) ? 'expired' : 'active';
}

/**
 * Only live bundles can be cancelled: a bundle that has already expired or been
 * cancelled is read-only.
 */
export function canCancelBundle(
	bundle: Pick<KeyBundle, 'expiresAt' | 'cancelledAt'>,
	nowMs: number
): boolean {
	return getBundleStatus(bundle, nowMs) === 'active';
}

/** Human-readable reason a bundle is no longer active. */
export function describeBundleEndReason(
	bundle: Pick<KeyBundle, 'expiresAt' | 'cancelledAt'>,
	nowMs: number
): string {
	switch (getBundleStatus(bundle, nowMs)) {
		case 'cancelled':
			return 'Cancelled by creator';
		case 'expired':
			return 'Expired';
		case 'active':
			return 'Active';
	}
}

/** Countdown state for a bundle's expiry timestamp. */
export function getBundleTimeRemainingState(
	expiresAt: string | null | undefined,
	nowMs: number
): { isExpired: boolean; label: string } {
	const parsed = expiresAt == null ? Number.NaN : new Date(expiresAt).getTime();
	if (Number.isNaN(parsed)) return { isExpired: false, label: '—' };

	const remainingMs = parsed - nowMs;
	if (remainingMs <= 0) return { isExpired: true, label: 'Expired' };

	return { isExpired: false, label: formatDropTimeRemaining(remainingMs) };
}

export interface PartitionedBundles {
	/** Bundles still purchasable, soonest to expire first. */
	active: KeyBundle[];
	/** Expired and cancelled bundles, most recently ended first. */
	archived: KeyBundle[];
}

/**
 * Splits a creator's bundles into the active list and the archive.
 *
 * Both sides are sorted by expiry so the countdown column reads in a sensible
 * order: the bundles about to lapse lead the active list, and the most
 * recently ended bundles lead the archive.
 */
export function partitionBundlesByStatus(
	bundles: KeyBundle[],
	nowMs: number
): PartitionedBundles {
	const active: KeyBundle[] = [];
	const archived: KeyBundle[] = [];

	for (const bundle of bundles) {
		if (getBundleStatus(bundle, nowMs) === 'active') active.push(bundle);
		else archived.push(bundle);
	}

	const byExpiry = (a: KeyBundle, b: KeyBundle) =>
		(resolveBundleExpiryMs(a) ?? 0) - (resolveBundleExpiryMs(b) ?? 0);

	active.sort(byExpiry);
	archived.sort((a, b) => byExpiry(b, a));

	return { active, archived };
}

/** Converts a day count into the ISO expiry timestamp sent to the contract. */
export function resolveBundleExpiryIso(expiryDays: number, nowMs: number): string {
	return new Date(nowMs + expiryDays * MS_PER_DAY).toISOString();
}

export interface BundleDraftValidation {
	itemsError: string | null;
	priceError: string | null;
	expiryError: string | null;
	isValid: boolean;
}

/**
 * Validates the raw create-bundle form values.
 *
 * The bundle price is checked against the list price of the selected line
 * items: it must be a real number, strictly below list (otherwise the bundle is
 * not a discount), and at or above the price floor. The expiry must be a whole
 * number of days inside the supported window.
 */
export function validateBundleDraft(
	items: BundleLineItem[],
	discountPriceRaw: string,
	expiryDaysRaw: string,
	listPriceXlm: number
): BundleDraftValidation {
	const itemsError = validateBundleItems(items);
	const priceError = validateBundlePrice(discountPriceRaw, listPriceXlm);
	const expiryError = validateBundleExpiryDays(expiryDaysRaw);

	return {
		itemsError,
		priceError,
		expiryError,
		isValid: !itemsError && !priceError && !expiryError,
	};
}

function validateBundleItems(items: BundleLineItem[]): string | null {
	if (items.length === 0) return 'Add at least one key to the bundle';

	const seen = new Set<string>();
	for (const item of items) {
		if (!item.keyId) return 'Every line needs a key';
		if (seen.has(item.keyId)) return 'A key can only be added once';
		seen.add(item.keyId);

		const quantity = Number(item.quantity);
		if (!Number.isInteger(quantity) || quantity <= 0) {
			return 'Quantities must be whole numbers greater than 0';
		}
	}

	return null;
}

function validateBundlePrice(
	discountPriceRaw: string,
	listPriceXlm: number
): string | null {
	const trimmed = discountPriceRaw.trim();
	const price = Number(trimmed);

	if (trimmed === '' || !Number.isFinite(price) || price <= 0) {
		return 'Enter a bundle price greater than 0';
	}

	if (!Number.isFinite(listPriceXlm) || listPriceXlm <= 0) {
		return 'The list price for this bundle is not known yet';
	}

	if (price >= listPriceXlm) {
		return `Bundle price must be below the ${listPriceXlm} XLM list price`;
	}

	const floorXlm = getBundlePriceFloorXlm(listPriceXlm);
	if (price < floorXlm) {
		return `Bundle price must be at least ${floorXlm} XLM (20% off list)`;
	}

	return null;
}

function validateBundleExpiryDays(expiryDaysRaw: string): string | null {
	const trimmed = expiryDaysRaw.trim();
	if (trimmed === '') return 'Enter a bundle expiry in days';

	const days = Number(trimmed);
	if (!Number.isInteger(days)) return 'Enter a whole number of days';
	if (days < BUNDLE_MIN_EXPIRY_DAYS) {
		return `Bundle expiry must be at least ${BUNDLE_MIN_EXPIRY_DAYS} day`;
	}
	if (days > BUNDLE_MAX_EXPIRY_DAYS) {
		return `Bundle expiry cannot exceed ${BUNDLE_MAX_EXPIRY_DAYS} days`;
	}

	return null;
}
