import { describe, expect, it } from 'vitest';
import {
	applyBuyToCostBasis,
	applySellToCostBasis,
	averagePurchasePriceFromCostBasis,
	KEY_COST_BASIS_STORAGE_KEY,
	resolveCostBasisWalletKey,
	useKeyCostBasis,
	type KeyCostBasisEntry,
} from '@/hooks/useKeyCostBasis';

const entry = (
	costBasisStroops: number,
	quantity: number
): KeyCostBasisEntry => ({ costBasisStroops, quantity, updatedAt: 0 });

describe('resolveCostBasisWalletKey', () => {
	it('scopes guest sessions under a shared key', () => {
		expect(resolveCostBasisWalletKey(undefined)).toBe('guest');
		expect(resolveCostBasisWalletKey(null)).toBe('guest');
		expect(resolveCostBasisWalletKey('   ')).toBe('guest');
	});

	it('normalises addresses so casing does not fork the cost basis', () => {
		expect(resolveCostBasisWalletKey('GBWalletXYZ')).toBe('gbwalletxyz');
		expect(resolveCostBasisWalletKey(' gbwalletxyz ')).toBe('gbwalletxyz');
	});
});

describe('averagePurchasePriceFromCostBasis', () => {
	it('divides the total paid by the keys it covers', () => {
		expect(averagePurchasePriceFromCostBasis(entry(5_000_000, 10))).toBe(
			500_000
		);
	});

	it('returns null when there is nothing to average', () => {
		expect(averagePurchasePriceFromCostBasis(null)).toBeNull();
		expect(averagePurchasePriceFromCostBasis(entry(5_000_000, 0))).toBeNull();
		expect(
			averagePurchasePriceFromCostBasis(entry(Number.NaN, 3))
		).toBeNull();
	});
});

describe('applyBuyToCostBasis', () => {
	it('seeds a fresh basis for the first buy', () => {
		const next = applyBuyToCostBasis(null, {
			quantity: 2,
			costStroops: 1_000_000,
		});

		expect(next.costBasisStroops).toBe(1_000_000);
		expect(next.quantity).toBe(2);
		expect(averagePurchasePriceFromCostBasis(next)).toBe(500_000);
	});

	it('re-weights the average price on a second buy at a different price', () => {
		// Existing: 2 keys at 500_000 (1 XLM total).
		// New buy: 2 keys for 2 XLM (1_000_000 each).
		// Weighted average => 3_000_000 / 4 = 750_000 per key.
		const next = applyBuyToCostBasis(entry(1_000_000, 2), {
			quantity: 2,
			costStroops: 2_000_000,
		});

		expect(next.costBasisStroops).toBe(3_000_000);
		expect(next.quantity).toBe(4);
		expect(averagePurchasePriceFromCostBasis(next)).toBe(750_000);
	});

	it('ignores non-positive trades', () => {
		const current = entry(1_000_000, 2);
		const next = applyBuyToCostBasis(current, {
			quantity: 0,
			costStroops: 1_000_000,
		});

		expect(next).toEqual(current);
	});
});

describe('applySellToCostBasis', () => {
	it('preserves the average purchase price of the remaining keys', () => {
		// 10 keys bought for 5 XLM (0.5 XLM each); sell 4 of them.
		const next = applySellToCostBasis(entry(5_000_000, 10), { quantity: 4 });

		expect(next?.quantity).toBe(6);
		expect(next?.costBasisStroops).toBe(3_000_000);
		expect(averagePurchasePriceFromCostBasis(next)).toBe(500_000);
	});

	it('drops the record when the position is fully closed', () => {
		expect(
			applySellToCostBasis(entry(5_000_000, 10), { quantity: 10 })
		).toBeNull();
		expect(
			applySellToCostBasis(entry(5_000_000, 10), { quantity: 25 })
		).toBeNull();
	});

	it('is a no-op without an existing record', () => {
		expect(applySellToCostBasis(null, { quantity: 2 })).toBeNull();
	});

	it('ignores non-positive sells', () => {
		const current = entry(5_000_000, 10);
		expect(applySellToCostBasis(current, { quantity: 0 })).toEqual(current);
	});
});

describe('useKeyCostBasis store', () => {
	const wallet = 'GStoreTest';
	const creatorId = 'creator-1';

	it('tracks buys across repeated purchases of the same key', () => {
		const store = useKeyCostBasis.getState();
		store.resetCostBasis(wallet, creatorId);

		store.recordBuy(wallet, creatorId, {
			quantity: 2,
			costStroops: 1_000_000,
		});
		store.recordBuy(wallet, creatorId, {
			quantity: 2,
			costStroops: 2_000_000,
		});

		expect(
			useKeyCostBasis
				.getState()
				.getAveragePurchasePriceStroops(wallet, creatorId)
		).toBe(750_000);
	});

	it('releases the sold share of the basis on a sell', () => {
		const store = useKeyCostBasis.getState();
		store.resetCostBasis(wallet, creatorId);
		store.recordBuy(wallet, creatorId, {
			quantity: 10,
			costStroops: 5_000_000,
		});
		store.recordSell(wallet, creatorId, { quantity: 4 });

		const remaining = useKeyCostBasis
			.getState()
			.getCostBasis(wallet, creatorId);

		expect(remaining?.quantity).toBe(6);
		expect(remaining?.costBasisStroops).toBe(3_000_000);
		expect(
			useKeyCostBasis
				.getState()
				.getAveragePurchasePriceStroops(wallet, creatorId)
		).toBe(500_000);
	});

	it('scopes cost basis per wallet so accounts never share a basis', () => {
		const store = useKeyCostBasis.getState();
		store.resetCostBasis('GWalletA', creatorId);
		store.resetCostBasis('GWalletB', creatorId);

		store.recordBuy('GWalletA', creatorId, {
			quantity: 1,
			costStroops: 1_000_000,
		});
		store.recordBuy('GWalletB', creatorId, {
			quantity: 1,
			costStroops: 4_000_000,
		});

		expect(
			useKeyCostBasis
				.getState()
				.getAveragePurchasePriceStroops('GWalletA', creatorId)
		).toBe(1_000_000);
		expect(
			useKeyCostBasis
				.getState()
				.getAveragePurchasePriceStroops('GWalletB', creatorId)
		).toBe(4_000_000);
	});

	it('persists recorded cost basis under a stable storage key', () => {
		const store = useKeyCostBasis.getState();
		store.resetCostBasis(wallet, creatorId);
		store.recordBuy(wallet, creatorId, { quantity: 3, costStroops: 900_000 });

		const persisted = JSON.parse(
			window.localStorage.getItem(KEY_COST_BASIS_STORAGE_KEY) ?? '{}'
		);

		expect(
			persisted.state.entriesByWallet[resolveCostBasisWalletKey(wallet)][
				creatorId
			]
		).toMatchObject({
			costBasisStroops: 900_000,
			quantity: 3,
		});
	});
});
