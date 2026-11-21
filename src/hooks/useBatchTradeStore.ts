/**
 * Batch trade store (#1155).
 *
 * Holds the creator keys a user has queued for a batch trade — a single
 * atomic `batch_swap` transaction covering every queued buy and sell order
 * with individual per-item slippage tolerances.
 *
 * Key features:
 *  - Keyed by `keyId` so each creator key has one queued order at a time.
 *  - Persisted to `sessionStorage` so the batch queue survives navigation and
 *    reloads within the same tab, but does not leak into a new session.
 *  - Controls drawer open/closed state so any button or link across pages
 *    can trigger the Batch Trade drawer cleanly.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { BATCH_BUY, BUY_QUANTITY_BOUNDS } from '@/constants/fees';
import { DEFAULT_SLIPPAGE_TOLERANCE_PERCENT } from '@/utils/slippageTolerance.utils';
import {
	clampBatchQuantity,
	clampBatchSlippage,
} from '@/utils/batchTrade.utils';
import type {
	BatchTradeItem,
	BatchTradeInput,
	BatchTradeDirection,
} from '@/types/batchTrade.types';

export const BATCH_TRADE_STORAGE_KEY = 'accesslayer.batch-trade';

export interface BatchTradeState {
	/** Ordered list of queued batch trade items. */
	items: BatchTradeItem[];
	/** Controls whether the Batch Trade drawer is open. */
	isOpen: boolean;

	// --- Actions ---
	addItem: (item: BatchTradeInput) => void;
	removeItem: (keyId: string) => void;
	updateAmount: (keyId: string, amount: number) => void;
	updateDirection: (keyId: string, direction: BatchTradeDirection) => void;
	updateSlippage: (keyId: string, slippageTolerance: number) => void;
	clearBatch: () => void;
	setIsOpen: (isOpen: boolean) => void;
	openDrawer: () => void;
	closeDrawer: () => void;
	toggleDrawer: () => void;
}

export const useBatchTradeStore = create<BatchTradeState>()(
	persist(
		set => ({
			items: [],
			isOpen: false,

			addItem: input =>
				set(state => {
					const existingIndex = state.items.findIndex(
						i => i.keyId === input.keyId
					);
					const amount = clampBatchQuantity(
						input.amount ?? BUY_QUANTITY_BOUNDS.MIN_QTY
					);
					const slippageTolerance = clampBatchSlippage(
						input.slippageTolerance ?? DEFAULT_SLIPPAGE_TOLERANCE_PERCENT
					);
					const direction = input.direction ?? 'buy';

					const newItem: BatchTradeItem = {
						...input,
						amount,
						slippageTolerance,
						direction,
					};

					if (existingIndex >= 0) {
						// Update existing item
						const updated = [...state.items];
						updated[existingIndex] = newItem;
						return { items: updated };
					}

					if (state.items.length >= BATCH_BUY.MAX_BASKET_ITEMS) {
						return state;
					}

					return { items: [...state.items, newItem] };
				}),

			removeItem: keyId =>
				set(state => ({
					items: state.items.filter(i => i.keyId !== keyId),
				})),

			updateAmount: (keyId, amount) =>
				set(state => ({
					items: state.items.map(i =>
						i.keyId === keyId
							? { ...i, amount: clampBatchQuantity(amount) }
							: i
					),
				})),

			updateDirection: (keyId, direction) =>
				set(state => ({
					items: state.items.map(i =>
						i.keyId === keyId ? { ...i, direction } : i
					),
				})),

			updateSlippage: (keyId, slippageTolerance) =>
				set(state => ({
					items: state.items.map(i =>
						i.keyId === keyId
							? { ...i, slippageTolerance: clampBatchSlippage(slippageTolerance) }
							: i
					),
				})),

			clearBatch: () => set(() => ({ items: [] })),

			setIsOpen: isOpen => set(() => ({ isOpen })),
			openDrawer: () => set(() => ({ isOpen: true })),
			closeDrawer: () => set(() => ({ isOpen: false })),
			toggleDrawer: () => set(state => ({ isOpen: !state.isOpen })),
		}),
		{
			name: BATCH_TRADE_STORAGE_KEY,
			storage: createJSONStorage(() => sessionStorage),
			partialize: state => ({ items: state.items }),
		}
	)
);

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export function selectBatchItemCount(state: BatchTradeState): number {
	return state.items.length;
}

export function selectBatchHasItems(state: BatchTradeState): boolean {
	return state.items.length > 0;
}

export function selectIsInBatch(
	state: BatchTradeState,
	keyId: string
): boolean {
	return state.items.some(i => i.keyId === keyId);
}

export function selectBatchItem(
	state: BatchTradeState,
	keyId: string
): BatchTradeItem | undefined {
	return state.items.find(i => i.keyId === keyId);
}

export function selectBatchIsOpen(state: BatchTradeState): boolean {
	return state.isOpen;
}
