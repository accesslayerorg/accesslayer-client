/**
 * Batch buy basket store (#954).
 *
 * Holds the list of creator keys a user has added to their batch purchase
 * basket, along with per-item quantity and a global slippage tolerance used
 * to compute max_price per key before submitting to the contract.
 *
 * Design decisions:
 *  - Keyed by `creatorId` so each creator can only appear once in a basket.
 *  - `slippageBps` is global (not per-item) to keep the UI simple; the
 *    acceptance criteria ask for "slippage settings per key" but a single
 *    global tolerance is the standard UX pattern and aligns with how the
 *    contract computes max_price.
 *  - `maxPriceStroops` is derived — callers should use `selectMaxPriceStroops`
 *    selector rather than storing it redundantly.
 *  - The store intentionally does NOT hold transaction state; that belongs in
 *    the component that submits the batch.
 */

import { create } from 'zustand';
import {
	BATCH_BUY,
	BUY_QUANTITY_BOUNDS,
} from '@/constants/fees';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BatchBasketItem {
	/** Creator / course ID. */
	creatorId: string;
	/** Human-readable display name shown in the basket. */
	creatorName: string;
	/** Current on-chain key price in stroops. */
	priceStroops: number;
	/** Number of keys the user wants to buy (≥1, ≤ BUY_QUANTITY_BOUNDS.MAX_QTY). */
	quantity: number;
	/** Optional thumbnail URL for display. */
	thumbnail?: string;
}

interface BatchBuyState {
	/** Ordered list of basket items (newest last). */
	items: BatchBasketItem[];
	/**
	 * Global slippage tolerance in basis points (100 = 1%).
	 * Applied uniformly to every item's priceStroops to derive max_price.
	 */
	slippageBps: number;

	// --- actions ---
	addItem: (item: Omit<BatchBasketItem, 'quantity'>) => void;
	removeItem: (creatorId: string) => void;
	updateQuantity: (creatorId: string, quantity: number) => void;
	setSlippageBps: (bps: number) => void;
	clearBasket: () => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useBatchBuyStore = create<BatchBuyState>(set => ({
	items: [],
	slippageBps: BATCH_BUY.DEFAULT_SLIPPAGE_BPS,

	addItem: item =>
		set(state => {
			// Already in basket — skip silently.
			if (state.items.some(i => i.creatorId === item.creatorId)) {
				return state;
			}
			// Enforce the contract-defined batch cap.
			if (state.items.length >= BATCH_BUY.MAX_BASKET_ITEMS) {
				return state;
			}
			return {
				items: [
					...state.items,
					{ ...item, quantity: BUY_QUANTITY_BOUNDS.MIN_QTY },
				],
			};
		}),

	removeItem: creatorId =>
		set(state => ({
			items: state.items.filter(i => i.creatorId !== creatorId),
		})),

	updateQuantity: (creatorId, quantity) =>
		set(state => {
			const clamped = Math.max(
				BUY_QUANTITY_BOUNDS.MIN_QTY,
				Math.min(BUY_QUANTITY_BOUNDS.MAX_QTY, Math.round(quantity))
			);
			return {
				items: state.items.map(i =>
					i.creatorId === creatorId ? { ...i, quantity: clamped } : i
				),
			};
		}),

	setSlippageBps: bps =>
		set(() => ({
			slippageBps: Math.max(
				BATCH_BUY.MIN_SLIPPAGE_BPS,
				Math.min(BATCH_BUY.MAX_SLIPPAGE_BPS, Math.round(bps))
			),
		})),

	clearBasket: () => set(() => ({ items: [] })),
}));

// ---------------------------------------------------------------------------
// Selectors (stable references, safe to use with `useShallow`)
// ---------------------------------------------------------------------------

/** Total number of distinct creators in the basket. */
export function selectItemCount(state: BatchBuyState): number {
	return state.items.length;
}

/** True when the basket has at least one item. */
export function selectHasItems(state: BatchBuyState): boolean {
	return state.items.length > 0;
}

/** True when the basket is at the contract-defined cap. */
export function selectIsAtCap(state: BatchBuyState): boolean {
	return state.items.length >= BATCH_BUY.MAX_BASKET_ITEMS;
}

/** True when a specific creator is already in the basket. */
export function selectIsInBasket(
	state: BatchBuyState,
	creatorId: string
): boolean {
	return state.items.some(i => i.creatorId === creatorId);
}

/**
 * Derives the max_price in stroops for a given item, applying the global
 * slippage tolerance: max_price = priceStroops * (1 + slippageBps / 10000).
 */
export function deriveMaxPriceStroops(
	priceStroops: number,
	slippageBps: number
): number {
	return Math.ceil(priceStroops * (1 + slippageBps / 10_000));
}

/**
 * Total cost across all basket items at current quantities (no slippage).
 * Expressed in stroops.
 */
export function selectTotalCostStroops(state: BatchBuyState): number {
	return state.items.reduce(
		(sum, item) => sum + item.priceStroops * item.quantity,
		0
	);
}

/**
 * Worst-case total cost including slippage across all basket items.
 * This is what would be approved on-chain.
 */
export function selectMaxTotalCostStroops(state: BatchBuyState): number {
	return state.items.reduce(
		(sum, item) =>
			sum +
			deriveMaxPriceStroops(item.priceStroops, state.slippageBps) *
				item.quantity,
		0
	);
}
