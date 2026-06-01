import { BUY_QUANTITY_BOUNDS } from '@/constants/fees';

export interface ClampingResult {
	value: number;
	adjusted: boolean;
	original: number;
	reason: 'below_min' | 'above_max' | 'none';
}

/**
 * Clamps a given buy quantity to the defined minimum and maximum bounds.
 * Non-numeric inputs are treated as below the minimum.
 * Values are rounded to the nearest integer as keys are discrete assets.
 * 
 * @param input The input value to clamp.
 * @param min The minimum allowed quantity (defaults to BUY_QUANTITY_BOUNDS.MIN_QTY).
 * @param max The maximum allowed quantity (defaults to BUY_QUANTITY_BOUNDS.MAX_QTY).
 */
export function clampBuyQuantity(
	input: number | string,
	min: number = BUY_QUANTITY_BOUNDS.MIN_QTY,
	max: number = BUY_QUANTITY_BOUNDS.MAX_QTY
): ClampingResult {
	const parsed = typeof input === 'number' ? input : parseFloat(input);
	
	if (isNaN(parsed) || !isFinite(parsed)) {
		return {
			value: min,
			adjusted: true,
			original: NaN,
			reason: 'below_min',
		};
	}

	// Quantities must be integers
	const rounded = Math.round(parsed);

	if (rounded < min) {
		return {
			value: min,
			adjusted: true,
			original: parsed,
			reason: 'below_min',
		};
	}

	if (rounded > max) {
		return {
			value: max,
			adjusted: true,
			original: parsed,
			reason: 'above_max',
		};
	}

	const adjustedByRounding = rounded !== parsed;

	return {
		value: rounded,
		adjusted: adjustedByRounding,
		original: parsed,
		reason: 'none',
	};
}
