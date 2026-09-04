import { STROOPS_PER_XLM } from '@/constants/stellar';
import { formatNumber } from '@/utils/numberFormat.utils';

export interface CreatorKeyPriceFields {
	priceStroops?: number | null;
	/** Legacy demo field interpreted as whole XLM when stroops are absent. */
	price?: number | null;
}

/**
 * Resolves the on-chain key price in stroops from explicit stroops or legacy XLM.
 */
export function resolveCreatorKeyPriceStroops(
	creator: CreatorKeyPriceFields
): number | null {
	if (creator.priceStroops != null && Number.isFinite(creator.priceStroops)) {
		return creator.priceStroops;
	}
	if (creator.price != null && Number.isFinite(creator.price)) {
		return Math.round(creator.price * STROOPS_PER_XLM);
	}
	return null;
}

/**
 * Estimates sell proceeds from current key price, supply, and sell quantity.
 * Returns null if estimate cannot be computed.
 */
export function estimateSellProceeds(
	keyPriceStroops: number | null | undefined,
	currentSupply: number | null | undefined,
	sellQuantity: number
): number | null {
	if (
		keyPriceStroops == null ||
		!Number.isFinite(keyPriceStroops) ||
		currentSupply == null ||
		!Number.isFinite(currentSupply) ||
		sellQuantity <= 0 ||
		!Number.isFinite(sellQuantity)
	) {
		return null;
	}

	// For estimate purposes, calculate proceeds as key price multiplied by quantity
	const estimatedProceeds = keyPriceStroops * sellQuantity;
	return estimatedProceeds;
}

/**
 * Formats a stroop amount for display as XLM, falling back to stroops when the
 * XLM value would round to zero at the default display precision.
 */
export function formatDisplayKeyPrice(
	stroops: number | null | undefined
): string {
	if (stroops == null || !Number.isFinite(stroops)) {
		return '—';
	}

	const xlm = stroops / STROOPS_PER_XLM;
	const xlmFormatted = formatNumber(xlm, {
		maximumFractionDigits: 4,
		minimumFractionDigits: 0,
	});

	const parsedXlm = Number.parseFloat(xlmFormatted.replace(/,/g, ''));
	const xlmWouldRoundToZero =
		stroops > 0 && (!Number.isFinite(parsedXlm) || parsedXlm === 0);

	if (xlmWouldRoundToZero) {
		return `${stroops.toLocaleString()} stroops`;
	}

	return `${xlmFormatted} XLM`;
}

/**
 * Convenience helper for creator records that may store stroops or legacy XLM.
 */
export function formatCreatorKeyPriceDisplay(
	creator: CreatorKeyPriceFields
): string {
	return formatDisplayKeyPrice(resolveCreatorKeyPriceStroops(creator));
}

/**
 * Formats a key price in stroops (bigint) to XLM with proper decimal precision.
 * Always displays 2 decimal places for prices >= 1 XLM, and 4 decimal places for prices < 1 XLM.
 */
export function formatKeyPrice(stroops: bigint): string {
	const STROOPS_PER_XLM_BI = 10_000_000n;
	const isBelowOneXlm = stroops < STROOPS_PER_XLM_BI;
	const decimals = isBelowOneXlm ? 4 : 2;

	const xlm = Number(stroops) / 10_000_000;
	const formattedValue = formatNumber(xlm, {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals,
	});

	return `${formattedValue} XLM`;
}

