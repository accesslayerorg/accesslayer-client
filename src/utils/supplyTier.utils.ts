/**
 * Supply milestone tiers for the marketplace listing (#918).
 *
 * A creator key's progress along the bonding curve can be read from its
 * minted supply (`creatorShareSupply`). These tiers bucket that supply into
 * coarse "how far along the curve is this key" milestones so users can filter
 * the marketplace, e.g. to keys that are still cheap to mint (Early) vs keys
 * that have nearly exhausted their curve (Fully issued).
 */

export interface SupplyTierDefinition {
	id: SupplyTierId;
	label: string;
	/** Shorter label for tight UI (badges, select boxes). */
	shortLabel: string;
	description: string;
	/** Inclusive lower bound on `creatorShareSupply`; `undefined` = unbounded. */
	minSupply?: number;
	/** Inclusive upper bound on `creatorShareSupply`; `undefined` = unbounded. */
	maxSupply?: number;
}

export type SupplyTierId = 'early' | 'growth' | 'established' | 'maxed';

/**
 * Supply filter offered on the marketplace page. `all` shows every listing
 * regardless of tier; the remaining values map to a `SupplyTierId`.
 */
export type SupplyTierFilter = 'all' | SupplyTierId;

/** Ordered list of every supply tier — also drives filter <option>s. */
export const SUPPLY_TIERS: readonly SupplyTierDefinition[] = [
	{
		id: 'early',
		label: 'Early',
		shortLabel: 'Early',
		description: 'Fewer than 100 keys minted — fresh off the curve.',
		minSupply: 0,
		maxSupply: 99,
	},
	{
		id: 'growth',
		label: 'Growth',
		shortLabel: 'Growth',
		description: 'Between 100 and 499 keys minted.',
		minSupply: 100,
		maxSupply: 499,
	},
	{
		id: 'established',
		label: 'Established',
		shortLabel: 'Established',
		description: 'Between 500 and 999 keys minted.',
		minSupply: 500,
		maxSupply: 999,
	},
	{
		id: 'maxed',
		label: 'Fully issued',
		shortLabel: 'Maxed',
		description: 'At least 1,000 keys minted — the curve is nearly exhausted.',
		minSupply: 1000,
	},
];

function findTierById(id: SupplyTierId): SupplyTierDefinition | undefined {
	return SUPPLY_TIERS.find(tier => tier.id === id);
}

/**
 * Maps a minted supply to its tier id (or null when the supply is unknown
 * or not a finite number, so callers can decide how to surface unknowns).
 */
export function classifySupplyTier(supply: number | null | undefined): SupplyTierId | null {
	if (supply == null || !Number.isFinite(supply)) return null;
	for (const tier of SUPPLY_TIERS) {
		const aboveMin = tier.minSupply === undefined || supply >= tier.minSupply;
		const belowMax = tier.maxSupply === undefined || supply <= tier.maxSupply;
		if (aboveMin && belowMax) return tier.id;
	}
	return null;
}

/** Human label for a tier id, falling back to the id when unknown. */
export function supplyTierLabel(id: SupplyTierId): string {
	return findTierById(id)?.label ?? id;
}

/**
 * Predicate used to filter a creator into (or out of) the selected tier.
 * `creatorShareSupply` unknown (null/undefined/NaN) never matches a specific
 * tier — those creators are only visible under the `all` filter.
 */
export function matchesSupplyTier(
	supply: number | null | undefined,
	filter: SupplyTierFilter
): boolean {
	if (filter === 'all') return true;
	return classifySupplyTier(supply) === filter;
}