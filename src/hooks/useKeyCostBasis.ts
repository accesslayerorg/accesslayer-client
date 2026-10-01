import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * localStorage key used by the persisted cost-basis store (#935). The store
 * keeps one cost-basis record per (wallet, creator key) pair so a page reload
 * does not lose the average purchase price the portfolio P&L is measured
 * against.
 */
export const KEY_COST_BASIS_STORAGE_KEY = 'accesslayer.key-cost-basis';

/**
 * Fallback key used when no wallet is connected. Cost basis is still persisted
 * but scoped under this shared guest key, mirroring the watchlist store.
 */
export const GUEST_COST_BASIS_KEY = 'guest';

/**
 * Normalises a wallet address into a storage scope. Addresses are lowercased so
 * mixed-case Stellar / EVM addresses share the same cost basis.
 */
export function resolveCostBasisWalletKey(address?: string | null): string {
	if (!address || !address.trim()) return GUEST_COST_BASIS_KEY;
	return address.trim().toLowerCase();
}

/**
 * Average-cost record for one creator key position: how much was paid in total
 * for the keys still held, and how many keys that total covers.
 */
export interface KeyCostBasisEntry {
	/** Total XLM (in stroops) paid for the keys currently held. */
	costBasisStroops: number;
	/** Number of keys this cost basis covers. */
	quantity: number;
	/** Epoch milliseconds of the last recorded trade. */
	updatedAt: number;
}

export interface KeyCostBasisTrade {
	/** Keys bought or sold. Always a positive magnitude. */
	quantity: number;
}

/**
 * Averages a cost-basis record into a per-key purchase price. Returns `null`
 * when there is nothing to average, so callers can distinguish "no cost basis"
 * from a genuine zero.
 */
export function averagePurchasePriceFromCostBasis(
	entry: KeyCostBasisEntry | null | undefined
): number | null {
	if (
		!entry ||
		!Number.isFinite(entry.costBasisStroops) ||
		!Number.isFinite(entry.quantity) ||
		entry.quantity <= 0 ||
		entry.costBasisStroops < 0
	) {
		return null;
	}

	return entry.costBasisStroops / entry.quantity;
}

/**
 * Folds a confirmed buy into a cost-basis record using the weighted-average
 * method: the new average price is the total paid across the old and new keys
 * divided by the combined quantity. This is what makes a second buy at a
 * different curve price produce a true blended entry price rather than
 * overwriting (or being overwritten by) the previous one.
 */
export function applyBuyToCostBasis(
	entry: KeyCostBasisEntry | null | undefined,
	trade: KeyCostBasisTrade & { costStroops: number }
): KeyCostBasisEntry {
	const quantity = Number.isFinite(trade.quantity) ? trade.quantity : 0;
	const costStroops = Number.isFinite(trade.costStroops)
		? trade.costStroops
		: 0;

	if (quantity <= 0 || costStroops <= 0) {
		return (
			entry ?? {
				costBasisStroops: 0,
				quantity: 0,
				updatedAt: Date.now(),
			}
		);
	}

	const previousQuantity =
		entry && Number.isFinite(entry.quantity) && entry.quantity > 0
			? entry.quantity
			: 0;
	const previousCost =
		entry &&
		Number.isFinite(entry.costBasisStroops) &&
		entry.costBasisStroops > 0
			? entry.costBasisStroops
			: 0;

	return {
		costBasisStroops: previousCost + costStroops,
		quantity: previousQuantity + quantity,
		updatedAt: Date.now(),
	};
}

/**
 * Folds a confirmed sell into a cost-basis record.
 *
 * Selling realises profit or loss, it does not change the price paid for the
 * keys that remain, so the average purchase price is preserved and only the
 * portion of the basis that left with the sold keys is released. A sell that
 * clears the position drops the record entirely, so a later buy starts a fresh
 * basis rather than inheriting a stale one.
 */
export function applySellToCostBasis(
	entry: KeyCostBasisEntry | null | undefined,
	trade: KeyCostBasisTrade
): KeyCostBasisEntry | null {
	if (!entry) return null;

	const quantity = Number.isFinite(trade.quantity) ? trade.quantity : 0;

	if (quantity <= 0) return entry;

	const soldQuantity = Math.min(quantity, entry.quantity);
	const remainingQuantity = entry.quantity - soldQuantity;

	if (remainingQuantity <= 0) {
		return null;
	}

	const averagePurchasePrice = averagePurchasePriceFromCostBasis(entry) ?? 0;

	return {
		costBasisStroops: Math.max(
			0,
			entry.costBasisStroops - averagePurchasePrice * soldQuantity
		),
		quantity: remainingQuantity,
		updatedAt: Date.now(),
	};
}

interface KeyCostBasisState {
	/** Cost-basis records keyed by wallet, then by creator key id. */
	entriesByWallet: Record<string, Record<string, KeyCostBasisEntry>>;
	/** Record a confirmed buy, re-weighting the average purchase price. */
	recordBuy: (
		wallet: string | null | undefined,
		creatorId: string,
		trade: KeyCostBasisTrade & { costStroops: number }
	) => void;
	/** Record a confirmed sell, releasing the sold keys' share of the basis. */
	recordSell: (
		wallet: string | null | undefined,
		creatorId: string,
		trade: KeyCostBasisTrade
	) => void;
	/** Forget the cost basis tracked for one creator key. */
	resetCostBasis: (
		wallet: string | null | undefined,
		creatorId: string
	) => void;
	/** Cost-basis record for one creator key, if any. */
	getCostBasis: (
		wallet: string | null | undefined,
		creatorId: string
	) => KeyCostBasisEntry | null;
	/** Weighted-average purchase price per key, in stroops. */
	getAveragePurchasePriceStroops: (
		wallet: string | null | undefined,
		creatorId: string
	) => number | null;
}

/**
 * Tracks the average purchase price of every creator key position a wallet
 * holds, so the portfolio can show real unrealised P&L (#935).
 *
 * Cost basis is inherently per-position state that only the client observes at
 * trade time, and it must survive reloads, so it is persisted per wallet rather
 * than refetched. Trades are recorded only once the mutation has succeeded, so
 * a failed or reverted trade never pollutes the basis.
 */
export const useKeyCostBasis = create<KeyCostBasisState>()(
	persist(
		(set, get) => ({
			entriesByWallet: {},

			recordBuy: (wallet, creatorId, trade) => {
				const walletKey = resolveCostBasisWalletKey(wallet);

				set(state => {
					const entries = state.entriesByWallet[walletKey] ?? {};
					const nextEntry = applyBuyToCostBasis(entries[creatorId], trade);

					return {
						entriesByWallet: {
							...state.entriesByWallet,
							[walletKey]: { ...entries, [creatorId]: nextEntry },
						},
					};
				});
			},

			recordSell: (wallet, creatorId, trade) => {
				const walletKey = resolveCostBasisWalletKey(wallet);

				set(state => {
					const entries = state.entriesByWallet[walletKey] ?? {};
					const nextEntry = applySellToCostBasis(
						entries[creatorId],
						trade
					);

					if (nextEntry == null) {
						if (entries[creatorId] == null) return state;

						const nextEntries = { ...entries };
						delete nextEntries[creatorId];

						return {
							entriesByWallet: {
								...state.entriesByWallet,
								[walletKey]: nextEntries,
							},
						};
					}

					return {
						entriesByWallet: {
							...state.entriesByWallet,
							[walletKey]: { ...entries, [creatorId]: nextEntry },
						},
					};
				});
			},

			resetCostBasis: (wallet, creatorId) => {
				const walletKey = resolveCostBasisWalletKey(wallet);

				set(state => {
					const entries = state.entriesByWallet[walletKey];

					if (entries?.[creatorId] == null) return state;

					const nextEntries = { ...entries };
					delete nextEntries[creatorId];

					return {
						entriesByWallet: {
							...state.entriesByWallet,
							[walletKey]: nextEntries,
						},
					};
				});
			},

			getCostBasis: (wallet, creatorId) => {
				const entries =
					get().entriesByWallet[resolveCostBasisWalletKey(wallet)];

				return entries?.[creatorId] ?? null;
			},

			getAveragePurchasePriceStroops: (wallet, creatorId) =>
				averagePurchasePriceFromCostBasis(
					get().entriesByWallet[resolveCostBasisWalletKey(wallet)]?.[
						creatorId
					]
				),
		}),
		{
			name: KEY_COST_BASIS_STORAGE_KEY,
			storage: createJSONStorage(() => localStorage),
			partialize: state => ({ entriesByWallet: state.entriesByWallet }),
		}
	)
);
