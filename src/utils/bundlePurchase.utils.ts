import type { MarketplaceBundle, MarketplaceBundleKey } from '@/types/bundles';

type BundleLike = Partial<MarketplaceBundle> & {
	keys?: MarketplaceBundleKey[] | null;
};
type KeyLike = Partial<MarketplaceBundleKey>;
type FilterOptions = number | Date | { nowMs?: number };

function isFiniteNumber(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value);
}

function getKeys(bundle: BundleLike | null | undefined): MarketplaceBundleKey[] {
	return Array.isArray(bundle?.keys) ? bundle.keys : [];
}

function lineTotal(
	keys: MarketplaceBundleKey[],
	priceFor: (key: MarketplaceBundleKey) => number
): number {
	return keys.reduce((total, key) => {
		const quantity = isFiniteNumber(key?.quantity) ? key.quantity : 0;
		return total + priceFor(key) * quantity;
	}, 0);
}

function keyIndividualStroops(key: KeyLike | null | undefined): number {
	return isFiniteNumber(key?.individualPriceStroops)
		? key.individualPriceStroops
		: 0;
}

function resolveIndividualTotal(bundle: BundleLike | null | undefined): number {
	if (isFiniteNumber(bundle?.individualTotalStroops)) {
		return bundle.individualTotalStroops;
	}
	return lineTotal(getKeys(bundle), keyIndividualStroops);
}

function resolveBundlePrice(bundle: BundleLike | null | undefined): number {
	if (isFiniteNumber(bundle?.bundlePriceStroops)) {
		return bundle.bundlePriceStroops;
	}
	const keys = getKeys(bundle);
	return lineTotal(keys, key =>
		isFiniteNumber(key?.discountedPriceStroops)
			? key.discountedPriceStroops
			: keyIndividualStroops(key)
	);
}

export function computeBundleSavingsStroops(
	bundle: MarketplaceBundle | null | undefined
): number;
export function computeBundleSavingsStroops(
	individualTotalStroops: number,
	bundlePriceStroops: number
): number;
export function computeBundleSavingsStroops(
	first: MarketplaceBundle | number | null | undefined,
	second?: number
): number {
	if (typeof first === 'number') {
		const individual = isFiniteNumber(first) ? first : 0;
		const price = isFiniteNumber(second) ? second : 0;
		return Math.max(0, individual - price);
	}

	const individual = resolveIndividualTotal(first);
	const price = resolveBundlePrice(first);
	return Math.max(0, individual - price);
}

export function computeBundleDiscountPercent(
	bundle: MarketplaceBundle | null | undefined
): number;
export function computeBundleDiscountPercent(
	savingsStroops: number,
	individualTotalStroops: number
): number;
export function computeBundleDiscountPercent(
	first: MarketplaceBundle | number | null | undefined,
	second?: number
): number {
	const { savings, individual } =
		typeof first === 'number'
			? {
					savings: isFiniteNumber(first) ? first : 0,
					individual: isFiniteNumber(second) ? second : 0,
				}
			: {
					savings: computeBundleSavingsStroops(first),
					individual: resolveIndividualTotal(first),
				};

	if (individual <= 0 || savings <= 0) return 0;
	return Math.round((savings / individual) * 10_000) / 100;
}

function isKeyLike(value: unknown): value is MarketplaceBundleKey {
	if (!value || typeof value !== 'object') return false;
	return (
		'individualPriceStroops' in value ||
		'discountedPriceStroops' in value ||
		'creatorId' in value
	);
}

export function getMarketplaceKeyDiscountedStroops(
	key: MarketplaceBundleKey | null | undefined,
	bundle?: MarketplaceBundle | null
): number;
export function getMarketplaceKeyDiscountedStroops(
	bundle: MarketplaceBundle | null | undefined,
	key: MarketplaceBundleKey | null | undefined
): number;
export function getMarketplaceKeyDiscountedStroops(
	first: MarketplaceBundleKey | MarketplaceBundle | null | undefined,
	second?: MarketplaceBundle | MarketplaceBundleKey | null
): number {
	const key = isKeyLike(first)
		? first
		: isKeyLike(second)
			? second
			: null;
	const bundle = isKeyLike(first)
		? second && !isKeyLike(second)
			? (second as MarketplaceBundle)
			: null
		: first && !isKeyLike(first)
			? (first as MarketplaceBundle)
			: null;

	if (!key) return 0;
	if (isFiniteNumber(key.discountedPriceStroops)) {
		return key.discountedPriceStroops;
	}

	const individual = keyIndividualStroops(key);
	if (!bundle || individual <= 0) return individual;

	const individualTotal = resolveIndividualTotal(bundle);
	if (individualTotal > 0) {
		const bundlePrice = resolveBundlePrice(bundle);
		return Math.round((individual * bundlePrice) / individualTotal);
	}

	if (isFiniteNumber(bundle.discountPercent)) {
		const percent = Math.min(100, Math.max(0, bundle.discountPercent));
		return Math.round(individual * ((100 - percent) / 100));
	}

	return individual;
}

export function isMarketplaceBundlePurchased(
	bundle: MarketplaceBundle | null | undefined
): boolean {
	if (!bundle) return false;
	if (bundle.purchased === true || bundle.isPurchased === true) return true;
	if (bundle.purchasedAt) return true;
	return false;
}

export function filterDiscoverableBundles(
	bundles: readonly MarketplaceBundle[] | null | undefined,
	options?: FilterOptions
): MarketplaceBundle[] {
	const nowMs =
		typeof options === 'number'
			? options
			: options instanceof Date
				? options.getTime()
				: (options?.nowMs ?? Date.now());

	return (bundles ?? []).filter(bundle => {
		if (!bundle || isMarketplaceBundlePurchased(bundle)) return false;
		if (!bundle.expiresAt) return true;
		const expiry = Date.parse(bundle.expiresAt);
		if (Number.isNaN(expiry)) return true;
		return expiry > nowMs;
	});
}
