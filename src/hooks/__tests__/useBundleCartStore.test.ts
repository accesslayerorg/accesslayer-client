import { beforeEach, describe, expect, it } from 'vitest';
import {
	BUNDLE_CART_STORAGE_KEY,
	clampBundleQuantity,
	useBundleCartStore,
	type BundleCartItem,
} from '../useBundleCartStore';
import { BUNDLE_BUY, BUY_QUANTITY_BOUNDS } from '@/constants/fees';

function makeItem(overrides: Partial<BundleCartItem> = {}): BundleCartItem {
	return {
		keyId: 'key-1',
		keyName: 'Alpha Key',
		priceStroops: 1_000_000,
		quantity: BUY_QUANTITY_BOUNDS.MIN_QTY,
		...overrides,
	};
}

function readPersistedItems(): BundleCartItem[] {
	const raw = window.sessionStorage.getItem(BUNDLE_CART_STORAGE_KEY);
	if (!raw) return [];
	return JSON.parse(raw).state.items;
}

describe('useBundleCartStore (#1118)', () => {
	beforeEach(() => {
		window.sessionStorage.clear();
		useBundleCartStore.setState({ items: [] });
	});

	it('adds an item with the minimum quantity', () => {
		useBundleCartStore.getState().addItem({
			keyId: 'key-1',
			keyName: 'Alpha Key',
			priceStroops: 1_000_000,
		});

		expect(useBundleCartStore.getState().items).toEqual([
			makeItem(),
		]);
	});

	it('dedupes by key id — adding twice keeps a single entry', () => {
		useBundleCartStore.getState().addItem({
			keyId: 'key-1',
			keyName: 'Alpha Key',
			priceStroops: 1_000_000,
		});
		useBundleCartStore.getState().addItem({
			keyId: 'key-1',
			keyName: 'Alpha Key',
			priceStroops: 2_000_000,
		});

		expect(useBundleCartStore.getState().items).toHaveLength(1);
		// The original entry is preserved untouched.
		expect(useBundleCartStore.getState().items[0].priceStroops).toBe(
			1_000_000
		);
	});

	it('enforces the contract-defined bundle cap', () => {
		for (let index = 0; index < BUNDLE_BUY.MAX_BUNDLE_ITEMS; index += 1) {
			useBundleCartStore.getState().addItem({
				keyId: `key-${index}`,
				keyName: `Key ${index}`,
				priceStroops: 1_000_000,
			});
		}

		useBundleCartStore.getState().addItem({
			keyId: 'key-overflow',
			keyName: 'Overflow',
			priceStroops: 1_000_000,
		});

		expect(useBundleCartStore.getState().items).toHaveLength(
			BUNDLE_BUY.MAX_BUNDLE_ITEMS
		);
		expect(
			useBundleCartStore.getState().items.some(
				item => item.keyId === 'key-overflow'
			)
		).toBe(false);
	});

	it('removes an item by key id', () => {
		useBundleCartStore.setState({
			items: [makeItem(), makeItem({ keyId: 'key-2', keyName: 'Beta' })],
		});

		useBundleCartStore.getState().removeItem('key-1');

		expect(useBundleCartStore.getState().items).toEqual([
			makeItem({ keyId: 'key-2', keyName: 'Beta' }),
		]);
	});

	it('updates quantity, clamped to the buy bounds', () => {
		useBundleCartStore.setState({ items: [makeItem()] });

		useBundleCartStore.getState().updateQuantity('key-1', 7);
		expect(useBundleCartStore.getState().items[0].quantity).toBe(7);

		// Below the minimum.
		useBundleCartStore.getState().updateQuantity('key-1', -5);
		expect(useBundleCartStore.getState().items[0].quantity).toBe(
			BUY_QUANTITY_BOUNDS.MIN_QTY
		);

		// Above the maximum.
		useBundleCartStore.getState().updateQuantity('key-1', 9_999);
		expect(useBundleCartStore.getState().items[0].quantity).toBe(
			BUY_QUANTITY_BOUNDS.MAX_QTY
		);

		// Non-finite input falls back to the minimum.
		useBundleCartStore.getState().updateQuantity('key-1', Number.NaN);
		expect(useBundleCartStore.getState().items[0].quantity).toBe(
			BUY_QUANTITY_BOUNDS.MIN_QTY
		);
	});

	it('clears the cart', () => {
		useBundleCartStore.setState({ items: [makeItem()] });

		useBundleCartStore.getState().clearCart();

		expect(useBundleCartStore.getState().items).toEqual([]);
	});

	it('persists the cart to sessionStorage so it survives navigation', () => {
		useBundleCartStore.getState().addItem({
			keyId: 'key-1',
			keyName: 'Alpha Key',
			priceStroops: 1_000_000,
		});

		expect(readPersistedItems()).toEqual([
			expect.objectContaining({ keyId: 'key-1' }),
		]);
	});

	it('restores the cart from persisted storage', () => {
		window.sessionStorage.setItem(
			BUNDLE_CART_STORAGE_KEY,
			JSON.stringify({
				state: {
					items: [makeItem({ keyId: 'key-persisted', quantity: 3 })],
				},
				version: 0,
			})
		);

		useBundleCartStore.persist.rehydrate();

		expect(useBundleCartStore.getState().items).toEqual([
			makeItem({ keyId: 'key-persisted', quantity: 3 }),
		]);
	});
});

describe('clampBundleQuantity (#1118)', () => {
	it('rounds and clamps into the buy bounds', () => {
		expect(clampBundleQuantity(4.6)).toBe(5);
		expect(clampBundleQuantity(0)).toBe(BUY_QUANTITY_BOUNDS.MIN_QTY);
		expect(clampBundleQuantity(10_000)).toBe(BUY_QUANTITY_BOUNDS.MAX_QTY);
		expect(clampBundleQuantity(Number.NaN)).toBe(
			BUY_QUANTITY_BOUNDS.MIN_QTY
		);
	});
});
