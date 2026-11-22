import { beforeEach, describe, expect, it } from 'vitest';
import {
	useBatchTradeStore,
	selectBatchItemCount,
	selectBatchHasItems,
	selectIsInBatch,
	selectBatchItem,
	selectBatchIsOpen,
	BATCH_TRADE_STORAGE_KEY,
} from '../useBatchTradeStore';
import type { BatchTradeInput } from '@/types/batchTrade.types';

function makeItem(overrides: Partial<BatchTradeInput> = {}): BatchTradeInput {
	return {
		keyId: 'key-1',
		keyName: 'Alice Explorer',
		priceStroops: 10_000_000,
		amount: 2,
		direction: 'buy',
		slippageTolerance: 1,
		...overrides,
	};
}

describe('useBatchTradeStore (#1155)', () => {
	beforeEach(() => {
		window.sessionStorage.clear();
		useBatchTradeStore.setState({ items: [], isOpen: false });
	});

	it('starts with an empty item list and closed drawer', () => {
		const state = useBatchTradeStore.getState();
		expect(state.items).toEqual([]);
		expect(state.isOpen).toBe(false);
		expect(selectBatchItemCount(state)).toBe(0);
		expect(selectBatchHasItems(state)).toBe(false);
	});

	it('adds a new item with clamped defaults', () => {
		useBatchTradeStore.getState().addItem(makeItem());

		const state = useBatchTradeStore.getState();
		expect(state.items).toHaveLength(1);
		expect(state.items[0]).toEqual(
			expect.objectContaining({
				keyId: 'key-1',
				keyName: 'Alice Explorer',
				amount: 2,
				direction: 'buy',
				slippageTolerance: 1,
			})
		);
		expect(selectBatchItemCount(state)).toBe(1);
		expect(selectBatchHasItems(state)).toBe(true);
		expect(selectIsInBatch(state, 'key-1')).toBe(true);
		expect(selectBatchItem(state, 'key-1')?.keyName).toBe('Alice Explorer');
	});

	it('updates existing item if added again with updated values', () => {
		useBatchTradeStore.getState().addItem(makeItem({ amount: 1, direction: 'buy' }));
		expect(useBatchTradeStore.getState().items[0].amount).toBe(1);

		useBatchTradeStore.getState().addItem(makeItem({ amount: 5, direction: 'sell' }));
		const items = useBatchTradeStore.getState().items;
		expect(items).toHaveLength(1);
		expect(items[0].amount).toBe(5);
		expect(items[0].direction).toBe('sell');
	});

	it('removes item by keyId', () => {
		useBatchTradeStore.getState().addItem(makeItem({ keyId: 'k1' }));
		useBatchTradeStore.getState().addItem(makeItem({ keyId: 'k2' }));
		expect(useBatchTradeStore.getState().items).toHaveLength(2);

		useBatchTradeStore.getState().removeItem('k1');
		const items = useBatchTradeStore.getState().items;
		expect(items).toHaveLength(1);
		expect(items[0].keyId).toBe('k2');
	});

	it('updates amount with clamping', () => {
		useBatchTradeStore.getState().addItem(makeItem({ keyId: 'k1', amount: 2 }));
		useBatchTradeStore.getState().updateAmount('k1', 15);
		expect(useBatchTradeStore.getState().items[0].amount).toBe(15);

		// Clamp negative or zero to MIN_QTY (1)
		useBatchTradeStore.getState().updateAmount('k1', -5);
		expect(useBatchTradeStore.getState().items[0].amount).toBe(1);

		// Clamp above MAX_QTY to 100
		useBatchTradeStore.getState().updateAmount('k1', 500);
		expect(useBatchTradeStore.getState().items[0].amount).toBe(100);
	});

	it('updates direction correctly', () => {
		useBatchTradeStore.getState().addItem(makeItem({ keyId: 'k1', direction: 'buy' }));
		expect(useBatchTradeStore.getState().items[0].direction).toBe('buy');

		useBatchTradeStore.getState().updateDirection('k1', 'sell');
		expect(useBatchTradeStore.getState().items[0].direction).toBe('sell');
	});

	it('updates per-item slippage tolerance correctly', () => {
		useBatchTradeStore.getState().addItem(makeItem({ keyId: 'k1', slippageTolerance: 1 }));
		expect(useBatchTradeStore.getState().items[0].slippageTolerance).toBe(1);

		useBatchTradeStore.getState().updateSlippage('k1', 2.5);
		expect(useBatchTradeStore.getState().items[0].slippageTolerance).toBe(2.5);

		// Clamp invalid
		useBatchTradeStore.getState().updateSlippage('k1', -1);
		expect(useBatchTradeStore.getState().items[0].slippageTolerance).toBe(0);

		useBatchTradeStore.getState().updateSlippage('k1', 75);
		expect(useBatchTradeStore.getState().items[0].slippageTolerance).toBe(50);
	});

	it('clears all items in batch', () => {
		useBatchTradeStore.getState().addItem(makeItem({ keyId: 'k1' }));
		useBatchTradeStore.getState().addItem(makeItem({ keyId: 'k2' }));
		expect(useBatchTradeStore.getState().items).toHaveLength(2);

		useBatchTradeStore.getState().clearBatch();
		expect(useBatchTradeStore.getState().items).toEqual([]);
		expect(selectBatchHasItems(useBatchTradeStore.getState())).toBe(false);
	});

	it('controls drawer visibility open, close, toggle, and setIsOpen', () => {
		expect(selectBatchIsOpen(useBatchTradeStore.getState())).toBe(false);

		useBatchTradeStore.getState().openDrawer();
		expect(selectBatchIsOpen(useBatchTradeStore.getState())).toBe(true);

		useBatchTradeStore.getState().closeDrawer();
		expect(selectBatchIsOpen(useBatchTradeStore.getState())).toBe(false);

		useBatchTradeStore.getState().toggleDrawer();
		expect(selectBatchIsOpen(useBatchTradeStore.getState())).toBe(true);

		useBatchTradeStore.getState().setIsOpen(false);
		expect(selectBatchIsOpen(useBatchTradeStore.getState())).toBe(false);
	});

	it('persists queued items to sessionStorage', () => {
		useBatchTradeStore.getState().addItem(makeItem({ keyId: 'k-persisted', keyName: 'Persisted' }));

		const stored = window.sessionStorage.getItem(BATCH_TRADE_STORAGE_KEY);
		expect(stored).not.toBeNull();
		const parsed = JSON.parse(stored!);
		expect(parsed.state.items).toEqual([
			expect.objectContaining({ keyId: 'k-persisted', keyName: 'Persisted' }),
		]);
	});
});
