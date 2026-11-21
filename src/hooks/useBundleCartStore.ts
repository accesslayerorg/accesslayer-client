/**
 * Bundle cart store (#1118).
 *
 * Holds the creator keys a user has queued for a bundle purchase — a single
 * atomic `bundle_buy` transaction covering every queued item.
 *
 * Design decisions:
 *  - Keyed by `keyId` so each creator key can only appear once in the cart.
 *  - Persisted to `sessionStorage` so the cart survives in-app navigation and
 *    full page reloads within the same browser tab, but never leaks into a
 *    new session.
 *  - The store intentionally does NOT hold transaction state; that belongs
 *    to `useBundleBuyMutation`.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { BUNDLE_BUY, BUY_QUANTITY_BOUNDS } from '@/constants/fees';

/** sessionStorage key backing the persisted bundle cart (#1118). */
export const BUNDLE_CART_STORAGE_KEY = 'accesslayer.bundle-cart';

export interface BundleCartItem {
	/** Creator / course ID — the key's on-chain identifier. */
	keyId: string;
	/** Human-readable display name shown in the cart. */
	keyName: string;
	/** Current on-chain key price in stroops. */
	priceStroops: number;
	/** Number of keys the user wants to buy (clamped to BUY_QUANTITY_BOUNDS). */
	quantity: number;
	/** Current circulating supply at add time, used for price impact estimates. */
	currentSupply?: number | null;
	/** Optional protocol fee in basis points, used for cost estimates. */
	protocolFeeBps?: number;
	/** Optional creator fee in basis points, used for cost estimates. */
	creatorFeeBps?: number;
	/** Optional thumbnail URL for display. */
	thumbnail?: string;
}

/** Item shape accepted by `addItem` — quantity defaults to the minimum. */
export type BundleCartInput = Omit<BundleCartItem, 'quantity'>;

interface BundleCartState {
	/** Ordered list of cart items (newest last). */
	items: BundleCartItem[];

	// --- actions ---
	addItem: (item: BundleCartInput) => void;
	removeItem: (keyId: string) => void;
	updateQuantity: (keyId: string, quantity: number) => void;
	clearCart: () => void;
}

/** Clamps a raw quantity into the contract-defined buy bounds. */
export function clampBundleQuantity(quantity: number): number {
	if (!Number.isFinite(quantity)) return BUY_QUANTITY_BOUNDS.MIN_QTY;
	return Math.max(
		BUY_QUANTITY_BOUNDS.MIN_QTY,
		Math.min(BUY_QUANTITY_BOUNDS.MAX_QTY, Math.round(quantity))
	);
}

export const useBundleCartStore = create<BundleCartState>()(
	persist(
		set => ({
			items: [],

			addItem: item =>
				set(state => {
					// Already in cart — skip silently.
					if (state.items.some(i => i.keyId === item.keyId)) {
						return state;
					}
					// Enforce the contract-defined bundle cap.
					if (state.items.length >= BUNDLE_BUY.MAX_BUNDLE_ITEMS) {
						return state;
					}
					return {
						items: [
							...state.items,
							{ ...item, quantity: BUY_QUANTITY_BOUNDS.MIN_QTY },
						],
					};
				}),

			removeItem: keyId =>
				set(state => ({
					items: state.items.filter(i => i.keyId !== keyId),
				})),

			updateQuantity: (keyId, quantity) =>
				set(state => ({
					items: state.items.map(i =>
						i.keyId === keyId
							? { ...i, quantity: clampBundleQuantity(quantity) }
							: i
					),
				})),

			clearCart: () => set(() => ({ items: [] })),
		}),
		{
			name: BUNDLE_CART_STORAGE_KEY,
			storage: createJSONStorage(() => sessionStorage),
			partialize: state => ({ items: state.items }),
		}
	)
);

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

/** Total number of distinct keys in the bundle cart. */
export function selectBundleItemCount(state: BundleCartState): number {
	return state.items.length;
}

/** True when the bundle cart has at least one item. */
export function selectBundleHasItems(state: BundleCartState): boolean {
	return state.items.length > 0;
}

/** True when a specific key is already in the bundle cart. */
export function selectIsInBundleCart(
	state: BundleCartState,
	keyId: string
): boolean {
	return state.items.some(i => i.keyId === keyId);
}
