import type { Course } from '@/services/course.service';
import { STROOPS_PER_XLM } from '@/constants/stellar';
import { REPUTATION_SCORE_MAX } from '@/utils/keyReputation.utils';
import { resolveCreatorKeyPriceStroops } from '@/utils/keyPriceDisplay.utils';

/**
 * Advanced search filters for the key discovery page (#1260).
 *
 * Every filter maps onto a URL query param so a filtered discovery view can
 * be shared. All matching happens client-side against the already-loaded
 * discovery results; keys whose value for an active filter is unknown are
 * excluded rather than treated as a match.
 */

export type DiscoveryFeeTier = 'standard' | 'elevated' | 'premium';

export interface DiscoveryFeeTierOption {
	value: DiscoveryFeeTier;
	label: string;
	/** Inclusive lower bound in basis points. */
	minBps: number;
	/** Exclusive upper bound in basis points; null means unbounded. */
	maxBps: number | null;
}

export const DISCOVERY_FEE_TIER_OPTIONS: readonly DiscoveryFeeTierOption[] = [
	{ value: 'standard', label: 'Standard (up to 2%)', minBps: 0, maxBps: 200 },
	{ value: 'elevated', label: 'Elevated (2%–5%)', minBps: 200, maxBps: 500 },
	{ value: 'premium', label: 'Premium (above 5%)', minBps: 500, maxBps: null },
];

export interface DiscoveryFilters {
	/** Minimum key price in XLM. */
	minPrice?: number;
	/** Maximum key price in XLM. */
	maxPrice?: number;
	/** Minimum 24h traded volume, in the same unit the API reports. */
	minVolume?: number;
	/** Maximum 24h traded volume, in the same unit the API reports. */
	maxVolume?: number;
	/** Minimum composite reputation score (0–1000). */
	minReputation?: number;
	feeTier?: DiscoveryFeeTier;
	supplyCappedOnly: boolean;
}

export const EMPTY_DISCOVERY_FILTERS: DiscoveryFilters = {
	supplyCappedOnly: false,
};

export const DISCOVERY_FILTER_SEARCH_PARAMS = {
	minPrice: 'min_price',
	maxPrice: 'max_price',
	minVolume: 'min_volume',
	maxVolume: 'max_volume',
	minReputation: 'min_reputation',
	feeTier: 'fee_tier',
	supplyCapped: 'supply_capped',
} as const;

const DISCOVERY_FILTER_PARAM_KEYS: readonly string[] = Object.values(
	DISCOVERY_FILTER_SEARCH_PARAMS
);

function parseNonNegativeNumber(raw: string | null): number | undefined {
	if (raw == null || raw.trim() === '') return undefined;
	const value = Number(raw);
	if (!Number.isFinite(value) || value < 0) return undefined;
	return value;
}

export function isValidDiscoveryFeeTier(
	value: string | null | undefined
): value is DiscoveryFeeTier {
	return DISCOVERY_FEE_TIER_OPTIONS.some(option => option.value === value);
}

export function getDiscoveryFeeTierOption(
	value: DiscoveryFeeTier
): DiscoveryFeeTierOption | undefined {
	return DISCOVERY_FEE_TIER_OPTIONS.find(option => option.value === value);
}

/** Reads the advanced search filters back out of the current URL. */
export function parseDiscoveryFilters(
	searchParams: URLSearchParams
): DiscoveryFilters {
	const filters: DiscoveryFilters = {
		supplyCappedOnly:
			searchParams.get(DISCOVERY_FILTER_SEARCH_PARAMS.supplyCapped) === '1',
	};

	const minPrice = parseNonNegativeNumber(
		searchParams.get(DISCOVERY_FILTER_SEARCH_PARAMS.minPrice)
	);
	if (minPrice !== undefined) filters.minPrice = minPrice;

	const maxPrice = parseNonNegativeNumber(
		searchParams.get(DISCOVERY_FILTER_SEARCH_PARAMS.maxPrice)
	);
	if (maxPrice !== undefined) filters.maxPrice = maxPrice;

	const minVolume = parseNonNegativeNumber(
		searchParams.get(DISCOVERY_FILTER_SEARCH_PARAMS.minVolume)
	);
	if (minVolume !== undefined) filters.minVolume = minVolume;

	const maxVolume = parseNonNegativeNumber(
		searchParams.get(DISCOVERY_FILTER_SEARCH_PARAMS.maxVolume)
	);
	if (maxVolume !== undefined) filters.maxVolume = maxVolume;

	const minReputation = parseNonNegativeNumber(
		searchParams.get(DISCOVERY_FILTER_SEARCH_PARAMS.minReputation)
	);
	if (minReputation !== undefined) {
		filters.minReputation = Math.min(REPUTATION_SCORE_MAX, minReputation);
	}

	const feeTier = searchParams.get(DISCOVERY_FILTER_SEARCH_PARAMS.feeTier);
	if (isValidDiscoveryFeeTier(feeTier)) filters.feeTier = feeTier;

	return filters;
}

/**
 * Serializes filters into URL query params, dropping any filter params that
 * are no longer active while preserving unrelated params on the URL.
 */
export function discoveryFiltersToSearchParams(
	filters: DiscoveryFilters,
	base: URLSearchParams = new URLSearchParams()
): URLSearchParams {
	const next = new URLSearchParams(base);
	DISCOVERY_FILTER_PARAM_KEYS.forEach(key => next.delete(key));

	if (filters.minPrice != null) {
		next.set(DISCOVERY_FILTER_SEARCH_PARAMS.minPrice, String(filters.minPrice));
	}
	if (filters.maxPrice != null) {
		next.set(DISCOVERY_FILTER_SEARCH_PARAMS.maxPrice, String(filters.maxPrice));
	}
	if (filters.minVolume != null) {
		next.set(
			DISCOVERY_FILTER_SEARCH_PARAMS.minVolume,
			String(filters.minVolume)
		);
	}
	if (filters.maxVolume != null) {
		next.set(
			DISCOVERY_FILTER_SEARCH_PARAMS.maxVolume,
			String(filters.maxVolume)
		);
	}
	if (filters.minReputation != null) {
		next.set(
			DISCOVERY_FILTER_SEARCH_PARAMS.minReputation,
			String(filters.minReputation)
		);
	}
	if (filters.feeTier) {
		next.set(DISCOVERY_FILTER_SEARCH_PARAMS.feeTier, filters.feeTier);
	}
	if (filters.supplyCappedOnly) {
		next.set(DISCOVERY_FILTER_SEARCH_PARAMS.supplyCapped, '1');
	}

	return next;
}

/** Removes every advanced search param from the given params. */
export function clearDiscoveryFilterSearchParams(
	base: URLSearchParams = new URLSearchParams()
): URLSearchParams {
	const next = new URLSearchParams(base);
	DISCOVERY_FILTER_PARAM_KEYS.forEach(key => next.delete(key));
	return next;
}

export interface ActiveDiscoveryFilter {
	/** Stable chip id, also used to decide which URL params to drop. */
	id: 'price' | 'volume' | 'reputation' | 'feeTier' | 'supplyCapped';
	label: string;
	/** URL params removed when this chip is dismissed. */
	params: readonly string[];
}

function formatFilterValue(value: number): string {
	return `${Number(value.toFixed(4))}`;
}

/** Human-readable chips for every filter type that is currently active. */
export function getActiveDiscoveryFilters(
	filters: DiscoveryFilters
): ActiveDiscoveryFilter[] {
	const chips: ActiveDiscoveryFilter[] = [];

	if (filters.minPrice != null || filters.maxPrice != null) {
		const label =
			filters.minPrice != null && filters.maxPrice != null
				? `Price ${formatFilterValue(filters.minPrice)}–${formatFilterValue(filters.maxPrice)} XLM`
				: filters.minPrice != null
					? `Price ≥ ${formatFilterValue(filters.minPrice)} XLM`
					: `Price ≤ ${formatFilterValue(filters.maxPrice as number)} XLM`;
		chips.push({
			id: 'price',
			label,
			params: [
				DISCOVERY_FILTER_SEARCH_PARAMS.minPrice,
				DISCOVERY_FILTER_SEARCH_PARAMS.maxPrice,
			],
		});
	}

	if (filters.minVolume != null || filters.maxVolume != null) {
		const label =
			filters.minVolume != null && filters.maxVolume != null
				? `24h volume ${formatFilterValue(filters.minVolume)}–${formatFilterValue(filters.maxVolume)}`
				: filters.minVolume != null
					? `24h volume ≥ ${formatFilterValue(filters.minVolume)}`
					: `24h volume ≤ ${formatFilterValue(filters.maxVolume as number)}`;
		chips.push({
			id: 'volume',
			label,
			params: [
				DISCOVERY_FILTER_SEARCH_PARAMS.minVolume,
				DISCOVERY_FILTER_SEARCH_PARAMS.maxVolume,
			],
		});
	}

	if (filters.minReputation != null) {
		chips.push({
			id: 'reputation',
			label: `Reputation ≥ ${formatFilterValue(filters.minReputation)}`,
			params: [DISCOVERY_FILTER_SEARCH_PARAMS.minReputation],
		});
	}

	if (filters.feeTier) {
		const option = getDiscoveryFeeTierOption(filters.feeTier);
		chips.push({
			id: 'feeTier',
			label: `Fee tier: ${option?.label ?? filters.feeTier}`,
			params: [DISCOVERY_FILTER_SEARCH_PARAMS.feeTier],
		});
	}

	if (filters.supplyCappedOnly) {
		chips.push({
			id: 'supplyCapped',
			label: 'Supply capped',
			params: [DISCOVERY_FILTER_SEARCH_PARAMS.supplyCapped],
		});
	}

	return chips;
}

/** Number of active filter types (price range counts once). */
export function countActiveDiscoveryFilters(filters: DiscoveryFilters): number {
	return getActiveDiscoveryFilters(filters).length;
}

/** Resolves the displayed key price in XLM, or null when it is unknown. */
export function getDiscoveryKeyPriceXlm(creator: Course): number | null {
	const stroops = resolveCreatorKeyPriceStroops(creator);
	if (stroops == null || !Number.isFinite(stroops)) return null;
	return stroops / STROOPS_PER_XLM;
}

/**
 * Whether a creator key satisfies every active filter. `reputationScore` is
 * optional because it is fetched separately per key; a key without a known
 * score fails the reputation filter instead of leaking through.
 */
export function matchesDiscoveryFilters(
	creator: Course,
	filters: DiscoveryFilters,
	reputationScore?: number | null
): boolean {
	if (filters.minPrice != null || filters.maxPrice != null) {
		const price = getDiscoveryKeyPriceXlm(creator);
		if (price == null) return false;
		if (filters.minPrice != null && price < filters.minPrice) return false;
		if (filters.maxPrice != null && price > filters.maxPrice) return false;
	}

	if (filters.minVolume != null || filters.maxVolume != null) {
		const volume = creator.volume24h;
		if (volume == null || !Number.isFinite(volume)) return false;
		if (filters.minVolume != null && volume < filters.minVolume) return false;
		if (filters.maxVolume != null && volume > filters.maxVolume) return false;
	}

	if (filters.minReputation != null) {
		if (
			reputationScore == null ||
			!Number.isFinite(reputationScore) ||
			reputationScore < filters.minReputation
		) {
			return false;
		}
	}

	if (filters.feeTier) {
		const option = getDiscoveryFeeTierOption(filters.feeTier);
		const feeBps = creator.creatorFeeBps;
		if (option == null || feeBps == null || !Number.isFinite(feeBps)) {
			return false;
		}
		if (feeBps < option.minBps) return false;
		if (option.maxBps != null && feeBps >= option.maxBps) return false;
	}

	if (filters.supplyCappedOnly) {
		const maxSupply = creator.maxSupply;
		if (maxSupply == null || !Number.isFinite(maxSupply) || maxSupply <= 0) {
			return false;
		}
	}

	return true;
}

/** Applies the active filters to a discovery result list. */
export function filterDiscoveryKeys(
	creators: Course[],
	filters: DiscoveryFilters,
	reputationScores: Record<string, number> = {}
): Course[] {
	if (countActiveDiscoveryFilters(filters) === 0) return creators;

	return creators.filter(creator =>
		matchesDiscoveryFilters(
			creator,
			filters,
			filters.minReputation != null ? reputationScores[creator.id] : undefined
		)
	);
}
