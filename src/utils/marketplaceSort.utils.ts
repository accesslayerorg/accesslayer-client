import type { Course, CourseSortOption } from '@/services/course.service';
import { resolveCreatorKeyPriceStroops } from '@/utils/keyPriceDisplay.utils';

/**
 * Client-side sorting for the marketplace listing (#918).
 *
 * Sort is applied to the already-loaded creators instead of triggering a
 * full server refetch: the infinite-list query keeps its loaded pages and we
 * re-order them in memory. Creators whose relevant field is unknown (e.g. no
 * resolvable key price) are pushed to the end of both ascending and
 * descending orders so they never jump ahead of priced listings.
 */

const UNKNOWN_PRICE_SORT_VALUE = -1;
const UNKNOWN_DATE_SORT_VALUE = 0;

function resolvedPriceOf(creator: Course): number {
	const price = resolveCreatorKeyPriceStroops(creator);
	if (price == null || !Number.isFinite(price)) return UNKNOWN_PRICE_SORT_VALUE;
	return price;
}

/** Newest first — uses joinedAt, falling back to nextDropAt/createdAt. */
function sortDateOf(creator: Course): number {
	for (const field of [creator.joinedAt, creator.nextDropAt, creator.createdAt]) {
		if (!field) continue;
		const time = new Date(field).getTime();
		if (Number.isFinite(time)) return time;
	}
	return UNKNOWN_DATE_SORT_VALUE;
}

function comparePrices(a: number, b: number, ascending: boolean): number {
	// Unknown price always sorts last, regardless of direction.
	if (a === UNKNOWN_PRICE_SORT_VALUE && b === UNKNOWN_PRICE_SORT_VALUE) return 0;
	if (a === UNKNOWN_PRICE_SORT_VALUE) return 1;
	if (b === UNKNOWN_PRICE_SORT_VALUE) return -1;
	return ascending ? a - b : b - a;
}

/**
 * Returns a new array with the creators sorted by `option`. Ascending and
 * descending price sorts both keep unknown-price entries at the end.
 */
export function sortCreatorsByOption(
	creators: Course[],
	option: CourseSortOption
): Course[] {
	const sorted = [...creators];

	switch (option) {
		case 'price_asc':
			sorted.sort((a, b) => comparePrices(resolvedPriceOf(a), resolvedPriceOf(b), true));
			break;
		case 'price_desc':
			sorted.sort((a, b) => comparePrices(resolvedPriceOf(a), resolvedPriceOf(b), false));
			break;
		case 'newest':
			sorted.sort((a, b) => sortDateOf(b) - sortDateOf(a));
			break;
		case 'volume_desc':
		default:
			sorted.sort((a, b) => (b.volume24h ?? 0) - (a.volume24h ?? 0));
			break;
	}

	return sorted;
}

/** Stable, human-friendly labels used by the sort <select>. */
export const MARKETPLACE_SORT_OPTIONS: ReadonlyArray<{
	value: CourseSortOption;
	label: string;
}> = [
	{ value: 'volume_desc', label: 'Volume: High to low' },
	{ value: 'price_asc', label: 'Price: Low to high' },
	{ value: 'price_desc', label: 'Price: High to low' },
	{ value: 'newest', label: 'Newest' },
];