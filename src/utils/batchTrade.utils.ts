/**
 * Batch trade / batch swap utilities (#1155).
 *
 * Pure functions shared by the batch trade drawer, components, and the
 * `batch_swap` contract call: per-item cost/proceeds estimation, aggregated
 * totals, combined price impact, and payload generation.
 */

import {
	calculateFeeBreakdown,
	type FeeBreakdown,
} from '@/utils/pricePreview.utils';
import { calculateTradePriceImpact } from '@/utils/priceImpact.utils';
import {
	computeMaxPriceStroops,
	computeMinPriceStroops,
	SLIPPAGE_TOLERANCE_BOUNDS,
	DEFAULT_SLIPPAGE_TOLERANCE_PERCENT,
} from '@/utils/slippageTolerance.utils';
import { BUY_QUANTITY_BOUNDS } from '@/constants/fees';
import type {
	BatchTradeItem,
	BatchSwapPayload,
	BatchSwapRequestItem,
} from '@/types/batchTrade.types';

/** Clamps an order amount into the contract-defined bounds. */
export function clampBatchQuantity(amount: number): number {
	if (!Number.isFinite(amount)) return BUY_QUANTITY_BOUNDS.MIN_QTY;
	return Math.max(
		BUY_QUANTITY_BOUNDS.MIN_QTY,
		Math.min(BUY_QUANTITY_BOUNDS.MAX_QTY, Math.round(amount))
	);
}

/** Clamps a per-item slippage tolerance percentage into standard bounds. */
export function clampBatchSlippage(slippage: number): number {
	if (!Number.isFinite(slippage)) return DEFAULT_SLIPPAGE_TOLERANCE_PERCENT;
	return Math.max(
		SLIPPAGE_TOLERANCE_BOUNDS.MIN_PERCENT,
		Math.min(SLIPPAGE_TOLERANCE_BOUNDS.MAX_PERCENT, slippage)
	);
}

export interface BatchItemCostEstimate {
	grossStroops: number;
	feeStroops: number;
	netCostStroops: number;
	feeBreakdown?: FeeBreakdown;
}

/**
 * Estimates cost or proceeds for one item in the batch.
 *
 * For buys: net cost includes protocol and creator fees.
 * For sells: proceeds are gross value minus fees (or gross value if 0 fees).
 */
export function estimateBatchItemCost(
	item: BatchTradeItem
): BatchItemCostEstimate {
	const quantity = item.amount;
	const keyPriceStroops = item.priceStroops;

	if (item.direction === 'buy') {
		const breakdown = calculateFeeBreakdown({
			quantity,
			keyPriceStroops,
			currentSupply: item.currentSupply ?? 0,
			protocolFeeBps: item.protocolFeeBps ?? 500,
			creatorFeeBps: item.creatorFeeBps ?? 500,
		});

		return {
			grossStroops: breakdown.grossCostStroops,
			feeStroops: breakdown.protocolFeeStroops + breakdown.creatorFeeStroops,
			netCostStroops: breakdown.totalCostStroops,
			feeBreakdown: breakdown,
		};
	}

	// Sell side
	const grossStroops = quantity * keyPriceStroops;
	const protocolFeeBps = item.protocolFeeBps ?? 500;
	const creatorFeeBps = item.creatorFeeBps ?? 500;
	const feeStroops = Math.round(
		grossStroops * ((protocolFeeBps + creatorFeeBps) / 10_000)
	);
	const netCostStroops = Math.max(0, grossStroops - feeStroops);

	return {
		grossStroops,
		feeStroops,
		netCostStroops,
	};
}

export interface BatchCostSummary {
	totalBuyCostStroops: number;
	totalSellProceedsStroops: number;
	netCostStroops: number;
	totalEstimatedCostStroops: number;
}

/**
 * Aggregates estimated costs across all items in the batch.
 *
 * `totalEstimatedCostStroops` reflects total gross or buy-side cost if only buys exist,
 * or net outlay (buys minus sells) if mixed.
 */
export function sumBatchTotalCostStroops(
	items: BatchTradeItem[]
): BatchCostSummary {
	let totalBuyCostStroops = 0;
	let totalSellProceedsStroops = 0;

	for (const item of items) {
		const estimate = estimateBatchItemCost(item);
		if (item.direction === 'buy') {
			totalBuyCostStroops += estimate.netCostStroops;
		} else {
			totalSellProceedsStroops += estimate.netCostStroops;
		}
	}

	const netCostStroops = totalBuyCostStroops - totalSellProceedsStroops;
	const totalEstimatedCostStroops =
		totalBuyCostStroops > 0 ? totalBuyCostStroops : totalSellProceedsStroops;

	return {
		totalBuyCostStroops,
		totalSellProceedsStroops,
		netCostStroops,
		totalEstimatedCostStroops,
	};
}

export interface BatchPriceImpactSummary {
	/** Cost-weighted average price impact across the batch, in percent. */
	totalImpactPercent: number;
	/** Number of items that contributed to the estimate. */
	estimatedItemCount: number;
	/** Number of items missing supply data. */
	unestimatedItemCount: number;
}

/**
 * Computes the combined, value-weighted price impact summary across all items.
 *
 * Uses `calculateTradePriceImpact` respecting each item's direction ('buy' vs 'sell').
 */
export function computeBatchPriceImpactSummary(
	items: BatchTradeItem[]
): BatchPriceImpactSummary | null {
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
			side: item.direction,
			quantity: item.amount,
			currentSupply: item.currentSupply,
		});

		const weight = Math.max(1, estimateBatchItemCost(item).netCostStroops);
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

/**
 * Builds the payload for the `batch_swap` contract call.
 */
export function buildBatchSwapPayload(
	items: BatchTradeItem[]
): BatchSwapPayload {
	const validItems = items.filter(
		item => Number.isFinite(item.amount) && item.amount > 0
	);

	const requestItems: BatchSwapRequestItem[] = validItems.map(item => {
		const slippage = item.slippageTolerance ?? DEFAULT_SLIPPAGE_TOLERANCE_PERCENT;
		return {
			keyId: item.keyId,
			direction: item.direction,
			amount: item.amount,
			slippageTolerance: slippage,
			priceStroops: item.priceStroops,
			maxPriceStroops:
				item.direction === 'buy'
					? computeMaxPriceStroops(item.priceStroops, slippage)
					: null,
			minPriceStroops:
				item.direction === 'sell'
					? computeMinPriceStroops(item.priceStroops, slippage)
					: null,
		};
	});

	const costSummary = sumBatchTotalCostStroops(validItems);
	const impactSummary = computeBatchPriceImpactSummary(validItems);

	return {
		items: requestItems,
		totalCostStroops: costSummary.totalEstimatedCostStroops,
		combinedPriceImpactPercent: impactSummary?.totalImpactPercent ?? null,
	};
}
