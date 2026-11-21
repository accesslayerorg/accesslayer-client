import type { Course, CourseSortOption } from '@/services/course.service';
import { resolveCreatorKeyPriceStroops } from '@/utils/keyPriceDisplay.utils';

/**
 * Sort + filter helpers for the key discovery feed (#1113).
 *
 * The feed paginates server-side but offers four orderings that the listing
 * endpoint doesn't all know about (trending momentum and market cap), so the
 * already-loaded pages are re-ordered in memory here — the same pattern the
 * marketplace uses (see marketplaceSort.utils). Entries whose sort key is
 * unknown always sink to the end of the list instead of jumping ahead.
 */

export type DiscoveryFeedSortOption =
	| 'trending'
	| 'newest'
	| 'volume'
	| 'market_cap';

export const DISCOVERY_FEED_SORT_OPTIONS: ReadonlyArray<{
	value: DiscoveryFeedSortOption;
	label: string;
}> = [
	{ value: 'trending', label: 'Trending' },
	{ value: 'newest', label: 'Newest' },
	{ value: 'volume', label: 'Volume' },
	{ value: 'market_cap', label: 'Market Cap' },
];

/**
 * Category chips offered by the feed. The backend takes a free-form
 * `category` param; these chips mirror the platform's starter categories —
 * "All" always lists every key regardless of category.
 */
export const DISCOVERY_FEED_CATEGORIES: readonly string[] = [
	'All',
	'Art',
	'Music',
	'Tech',
	'Finance',
	'Fashion',
	'Design',
	'Writing',
	'Photography',
];

export const DEFAULT_DISCOVERY_CATEGORY = 'All';

export function isValidDiscoveryFeedSort(
	value: string | null | undefined
): value is DiscoveryFeedSortOption {
	return DISCOVERY_FEED_SORT_OPTIONS.some(option => option.value === value);
}

/**
 * Maps a feed sort onto the closest ordering the /courses endpoint supports,
 * so pagination comes back roughly pre-sorted before the client-side pass.
 */
export function mapDiscoverySortToServerSort(
	option: DiscoveryFeedSortOption
): CourseSortOption {
	switch (option) {
		case 'newest':
			return 'newest';
		case 'market_cap':
			return 'price_desc';
		case 'trending':
		case 'volume':
		default:
			return 'volume_desc';
	}
}

/**
 * Rough market-cap estimate in stroops: current price × keys minted so far.
 * Returns `null` when either input is unknown so those keys sort last.
 */
export function computeMarketCapStroops(creator: Course): number | null {
	const priceStroops = resolveCreatorKeyPriceStroops(creator);
	const supply = creator.creatorShareSupply;

	if (
		priceStroops == null ||
		!Number.isFinite(priceStroops) ||
		priceStroops <= 0 ||
		supply == null ||
		!Number.isFinite(supply) ||
		supply <= 0
	) {
		return null;
	}

	return priceStroops * supply;
}

/**
 * Trending momentum score: recent volume weighted by positive 24h movement.
 * Flat or falling keys keep their raw volume; only growth adds weight.
 */
export function computeTrendingScore(creator: Course): number {
	const volume = creator.volume24h ?? 0;
	const change = creator.change24h ?? 0;
	const momentumMultiplier = 1 + Math.max(change, 0) / 100;
	return volume * momentumMultiplier;
}

function creationTimeMs(creator: Course): number {
	for (const field of [creator.createdAt, creator.joinedAt, creator.nextDropAt]) {
		if (!field) continue;
		const time = new Date(field).getTime();
		if (Number.isFinite(time)) return time;
	}
	return 0;
}

function compareDescending(
	a: number | null,
	b: number | null
): number {
	const aKnown = a != null && Number.isFinite(a);
	const bKnown = b != null && Number.isFinite(b);
	if (!aKnown && !bKnown) return 0;
	if (!aKnown) return 1;
	if (!bKnown) return -1;
	return (b as number) - (a as number);
}

/**
 * Returns a new array of creators ordered by the feed sort. Stable for
 * equal keys; unknown sort keys always sort last.
 */
export function sortDiscoveryKeys(
	creators: Course[],
	option: DiscoveryFeedSortOption
): Course[] {
	const sorted = [...creators];

	switch (option) {
		case 'newest':
			sorted.sort((a, b) => creationTimeMs(b) - creationTimeMs(a));
			break;
		case 'volume':
			sorted.sort((a, b) => compareDescending(a.volume24h ?? null, b.volume24h ?? null));
			break;
		case 'market_cap':
			sorted.sort((a, b) =>
				compareDescending(computeMarketCapStroops(a), computeMarketCapStroops(b))
			);
			break;
		case 'trending':
		default:
			sorted.sort((a, b) =>
				compareDescending(computeTrendingScore(a), computeTrendingScore(b))
			);
			break;
	}

	return sorted;
}

/**
 * Case-insensitive category filter. "All" (or an empty value) passes every
 * key through unchanged.
 */
export function filterDiscoveryKeysByCategory(
	creators: Course[],
	category: string | null | undefined
): Course[] {
	const normalized = category?.trim().toLowerCase();
	if (!normalized || normalized === DEFAULT_DISCOVERY_CATEGORY.toLowerCase()) {
		return creators;
	}
	return creators.filter(
		creator => (creator.category ?? '').trim().toLowerCase() === normalized
	);
}
