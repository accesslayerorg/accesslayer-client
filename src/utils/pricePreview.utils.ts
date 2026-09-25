/**
 * Price preview utilities for calculating and managing fee breakdowns.
 * Handles computation of gross cost, protocol fees, creator fees, and totals.
 */

export interface FeeBreakdown {
	/** Gross cost before fees (stroops) */
	grossCostStroops: number;
	/** Protocol fee in stroops */
	protocolFeeStroops: number;
	/** Protocol fee percentage (e.g., 2.5 for 2.5%) */
	protocolFeeBps: number;
	/** Creator fee in stroops */
	creatorFeeStroops: number;
	/** Creator fee percentage (e.g., 2.5 for 2.5%) */
	creatorFeeBps: number;
	/** Total cost after all fees (stroops) */
	totalCostStroops: number;
}

export interface PricePreviewRequest {
	quantity: number;
	/** Per-key price in stroops */
	keyPriceStroops: number;
	/** Current supply for bonding curve calculation */
	currentSupply: number;
	/** Protocol fee in basis points (100 = 1%) */
	protocolFeeBps?: number;
	/** Creator fee in basis points (100 = 1%) */
	creatorFeeBps?: number;
}

/**
 * Calculates fee breakdown for a buy transaction.
 *
 * @param request Price preview request with quantity, key price, and fee rates
 * @returns Fee breakdown with gross cost, individual fees, and total
 *
 * @example
 * ```ts
 * const breakdown = calculateFeeBreakdown({
 *   quantity: 10,
 *   keyPriceStroops: 1_000_000, // 0.1 XLM per key
 *   currentSupply: 100,
 *   protocolFeeBps: 250, // 2.5%
 *   creatorFeeBps: 250, // 2.5%
 * });
 * // Returns: { grossCostStroops: 10_000_000, protocolFeeStroops: 250_000, ... }
 * ```
 */
export function calculateFeeBreakdown(
	request: PricePreviewRequest
): FeeBreakdown {
	const {
		quantity,
		keyPriceStroops,
		protocolFeeBps = 0,
		creatorFeeBps = 0,
	} = request;

	// For now, use simple linear pricing: gross = key_price * quantity
	// This can be replaced with bonding curve logic if needed
	const grossCostStroops = keyPriceStroops * quantity;

	// Calculate fees based on basis points (100 bps = 1%)
	const protocolFeeStroops = Math.round(
		(grossCostStroops * protocolFeeBps) / 10_000
	);
	const creatorFeeStroops = Math.round(
		(grossCostStroops * creatorFeeBps) / 10_000
	);

	const totalCostStroops =
		grossCostStroops + protocolFeeStroops + creatorFeeStroops;

	return {
		grossCostStroops,
		protocolFeeStroops,
		protocolFeeBps,
		creatorFeeStroops,
		creatorFeeBps,
		totalCostStroops,
	};
}

/**
 * Simulates fetching price preview from backend.
 * In production, this would call an API endpoint.
 *
 * @param request Price preview request
 * @returns Promise resolving to fee breakdown or null on failure
 */
export async function fetchPricePreview(
	request: PricePreviewRequest
): Promise<FeeBreakdown | null> {
	// Simulate network delay
	await new Promise(resolve => setTimeout(resolve, 300));

	// Simulate occasional failures (for testing retry logic)
	// In production, this would be an actual API call
	if (Math.random() > 0.95) {
		throw new Error('Price preview fetch failed');
	}

	return calculateFeeBreakdown(request);
}
