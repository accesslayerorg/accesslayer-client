/**
 * Fee discount tier helpers (#1173).
 *
 * The connected wallet's active loyalty tier discounts the swap fee. This
 * module owns the tier shape, the tier→colour map used by the confirmation
 * modal chip, and the arithmetic that turns (base fee, discount) into the
 * final fee the user actually pays.
 */

export type FeeDiscountTier = 'None' | 'Bronze' | 'Silver' | 'Gold' | 'Platinum';

export interface FeeDiscount {
	/** Active loyalty tier. `None` means no discount. */
	tier: FeeDiscountTier;
	/** Percentage off the base fee, 0–100. */
	discountPercent: number;
	/** Whether the discount is currently active. */
	active: boolean;
}

export const NO_FEE_DISCOUNT: FeeDiscount = {
	tier: 'None',
	discountPercent: 0,
	active: false,
};

/**
 * Tier colours used by the discount chip (#1173).
 * Bronze is grey (not the warm metal) so it reads as "lowest tier" without
 * competing with the Gold highlight.
 */
export const TIER_COLOURS: Record<FeeDiscountTier, string> = {
	None: 'bg-white/10 text-white/60 border-white/10',
	Bronze: 'bg-slate-400/15 text-slate-300 border-slate-400/30',
	Silver: 'bg-sky-200/15 text-sky-100 border-sky-200/30',
	Gold: 'bg-amber-300/15 text-amber-200 border-amber-300/40',
	Platinum: 'bg-violet-300/15 text-violet-200 border-violet-300/40',
};

/** True when the wallet has a discount worth showing. */
export function hasActiveDiscount(discount: FeeDiscount | null | undefined): discount is FeeDiscount {
	return (
		!!discount &&
		discount.active &&
		discount.tier !== 'None' &&
		discount.discountPercent > 0
	);
}

/**
 * Apply a percentage discount to a base fee amount.
 * Rounds half-up to the nearest whole stroop so the final fee never drifts
 * by a sub-unit either way.
 */
export function applyFeeDiscount(
	baseFee: number,
	discountPercent: number
): number {
	if (!Number.isFinite(baseFee) || baseFee < 0) {
		throw new Error('baseFee must be a non-negative finite number');
	}
	if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
		throw new Error('discountPercent must be between 0 and 100');
	}
	const discountAmount = Math.round((baseFee * discountPercent) / 100);
	return baseFee - discountAmount;
}

export interface FeeDiscountBreakdown {
	/** Fee before any loyalty discount. */
	baseFee: number;
	/** Absolute amount taken off. */
	discountAmount: number;
	/** Fee after the discount. */
	finalFee: number;
	/** The discount that produced this breakdown (or null when none). */
	discount: FeeDiscount | null;
}

/**
 * Build the fee rows the confirmation modal renders: base fee, the discount
 * (when there is one), and the final fee.
 */
export function buildFeeDiscountBreakdown(
	baseFee: number,
	discount: FeeDiscount | null | undefined
): FeeDiscountBreakdown {
	const active = hasActiveDiscount(discount) ? discount : null;
	const discountPercent = active ? active.discountPercent : 0;
	const finalFee = applyFeeDiscount(baseFee, discountPercent);

	return {
		baseFee,
		discountAmount: baseFee - finalFee,
		finalFee,
		discount: active,
	};
}
