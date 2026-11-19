/**
 * Wallet volume discount tier classification for the trade confirmation
 * screen and wallet profile page (#1102).
 *
 * Distinct from `getVolumeTierDiscountBps` in dynamicFeeRate.utils.ts, which
 * discounts a single trade's notional value. This classifies a wallet's
 * cumulative trading volume (fetched from the API on wallet connect) into a
 * bronze/silver/gold badge with its own, larger discount schedule.
 */

export type VolumeDiscountTier = 'bronze' | 'silver' | 'gold';

/** Cumulative-volume thresholds, in stroops, for each tier. */
export const TIER_THRESHOLDS_STROOPS: Record<VolumeDiscountTier, number> = {
	bronze: 1_000_000_000, // 100 XLM
	silver: 10_000_000_000, // 1,000 XLM
	gold: 100_000_000_000, // 10,000 XLM
};

/** Discount granted by each tier, in basis points. */
export const TIER_DISCOUNT_BPS: Record<VolumeDiscountTier, number> = {
	bronze: 25, // 0.25%
	silver: 75, // 0.75%
	gold: 150, // 1.5%
};

/** Tiers ordered from lowest to highest, for progress/next-tier lookups. */
const TIER_ORDER: VolumeDiscountTier[] = ['bronze', 'silver', 'gold'];

/**
 * Classifies cumulative wallet volume into a discount tier, or `null` when
 * the wallet hasn't reached the bronze threshold yet (no badge is shown).
 */
export function classifyVolumeDiscountTier(
	cumulativeVolumeStroops: number
): VolumeDiscountTier | null {
	if (
		!Number.isFinite(cumulativeVolumeStroops) ||
		cumulativeVolumeStroops < TIER_THRESHOLDS_STROOPS.bronze
	) {
		return null;
	}
	if (cumulativeVolumeStroops >= TIER_THRESHOLDS_STROOPS.gold) return 'gold';
	if (cumulativeVolumeStroops >= TIER_THRESHOLDS_STROOPS.silver)
		return 'silver';
	return 'bronze';
}

/** The discount a tier grants, in basis points; 0 for no tier (null). */
export function getTierDiscountBps(tier: VolumeDiscountTier | null): number {
	return tier == null ? 0 : TIER_DISCOUNT_BPS[tier];
}

export interface TierProgress {
	/** The next tier the wallet is progressing toward, or null at the top tier. */
	nextTier: VolumeDiscountTier | null;
	/** Additional volume (in stroops) needed to reach `nextTier`; null at the top tier. */
	volumeStroopsToNextTier: number | null;
}

/**
 * Computes how much additional cumulative volume a wallet needs to reach
 * the next tier, for the tier-progress tooltip. Returns `nextTier: null`
 * once the wallet has reached gold, the top tier.
 */
export function computeTierProgress(
	cumulativeVolumeStroops: number
): TierProgress {
	const safeVolume = Number.isFinite(cumulativeVolumeStroops)
		? Math.max(0, cumulativeVolumeStroops)
		: 0;

	for (const tier of TIER_ORDER) {
		const threshold = TIER_THRESHOLDS_STROOPS[tier];
		if (safeVolume < threshold) {
			return {
				nextTier: tier,
				volumeStroopsToNextTier: threshold - safeVolume,
			};
		}
	}

	return { nextTier: null, volumeStroopsToNextTier: null };
}
