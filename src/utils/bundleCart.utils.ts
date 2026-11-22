/**
 * Bundle cart helpers for the bundle buy flow (#1118).
 *
 * Pure functions shared by the bundle cart drawer and the `bundle_buy`
 * mutation: per-item cost estimation, cart totals, a cost-weighted price
 * impact summary, and the payload handed to the contract call.
 */

import {
	calculateFeeBreakdown,
	type FeeBreakdown,
} from '@/utils/pricePreview.utils';
import { calculateTradePriceImpact } from '@/utils/priceImpact.utils';
import type { BundleCartItem } from '@/hooks/useBundleCartStore';

/** Fee breakdown for one cart item at its current quantity. */
export function estimateBundleItemCost(
	item: BundleCartItem
): FeeBreakdown {
	return calculateFeeBreakdown({
		quantity: item.quantity,
		keyPriceStroops: item.priceStroops,
		currentSupply: item.currentSupply ?? 0,
		protocolFeeBps: item.protocolFeeBps ?? 0,
		creatorFeeBps: item.creatorFeeBps ?? 0,
	});
}

/** Total cost (including fees) across all cart items, in stroops. */
export function sumBundleTotalCostStroops(items: BundleCartItem[]): number {
	return items.reduce(
		(sum, item) => sum + estimateBundleItemCost(item).totalCostStroops,
		0
	);
}

export interface BundlePriceImpactSummary {
	/** Cost-weighted average price impact across the bundle, in percent. */
	totalImpactPercent: number;
	/** How many items contributed to the estimate (had supply data). */
	estimatedItemCount: number;
	/** How many items were skipped for missing supply data. */
	unestimatedItemCount: number;
}

/**
 * Cost-weighted average buy-side price impact across the bundle.
 *
 * Each item's bonding-curve impact is weighted by its estimated cost, so
 * bigger positions dominate the summary — the same way a merged trade would
 * feel to the buyer. Returns `null` when no item carries supply data.
 */
export function computeBundlePriceImpactSummary(
	items: BundleCartItem[]
): BundlePriceImpactSummary | null {
	let weightedImpact = 0;
	let totalWeight = 0;
	let estimatedItemCount = 0;
	let unestimatedItemCount = 0;

	for (const item of items) {
		if (
			item.currentSupply == null ||
			!Number.isFinite(item.currentSupply) ||
			item.currentSupply < 0
		) {
			unestimatedItemCount += 1;
			continue;
		}

		const impactPercent = calculateTradePriceImpact({
			side: 'buy',
			quantity: item.quantity,
			currentSupply: item.currentSupply,
		});
		const weight = estimateBundleItemCost(item).totalCostStroops;

		weightedImpact += impactPercent * weight;
		totalWeight += weight;
		estimatedItemCount += 1;
	}

	if (estimatedItemCount === 0 || totalWeight <= 0) return null;

	return {
		totalImpactPercent: weightedImpact / totalWeight,
		estimatedItemCount,
		unestimatedItemCount,
	};
}

/** One line of the `bundle_buy` contract call. */
export interface BundleBuyRequestItem {
	keyId: string;
	amount: number;
}

/** Payload handed to the `bundle_buy` contract call. */
export interface BundleBuyPayload {
	items: BundleBuyRequestItem[];
	totalCostStroops: number;
}

/**
 * Builds the `bundle_buy` contract payload for a set of cart items.
 *
 * Items with a non-positive quantity are dropped so a malformed cart can
 * never submit an invalid line to the contract.
 */
export function buildBundleBuyPayload(
	items: BundleCartItem[]
): BundleBuyPayload {
	const payableItems = items.filter(
		item => Number.isFinite(item.quantity) && item.quantity > 0
	);

	return {
		items: payableItems.map(item => ({
			keyId: item.keyId,
			amount: item.quantity,
		})),
		totalCostStroops: sumBundleTotalCostStroops(payableItems),
	};
}
