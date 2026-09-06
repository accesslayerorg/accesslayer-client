import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * localStorage key used by the persisted recently-viewed store.
 */
export const RECENTLY_VIEWED_STORAGE_KEY = 'accesslayer.recently-viewed';

/** Maximum number of keys kept in the recently-viewed list. */
export const RECENTLY_VIEWED_LIMIT = 5;

/**
 * A lightweight snapshot of a creator key captured at the moment it was
 * visited, so the recently-viewed section on the homepage can render without
 * re-fetching every key.
 */
export interface RecentlyViewedKey {
	id: string;
	title: string;
	/** Current key price in XLM (legacy field, kept for display). */
	price: number;
	/** On-chain key price in stroops (preferred over `price`). */
	priceStroops?: number;
	/** Percentage change over 24h. */
	change24h?: number;
	category?: string;
	/** Avatar image URL used by the compact card. */
	avatarUri?: string;
	/** Wallet address used to derive a blockie fallback avatar. */
	walletAddress?: string;
	/** Timestamp (epoch ms) of the visit, newest first. */
	viewedAt: number;
}

interface RecentlyViewedState {
	keys: RecentlyViewedKey[];
	/** Record a key visit, deduplicating by id and capping at the limit. */
	addKey: (key: Omit<RecentlyViewedKey, 'viewedAt'>) => void;
	/** Remove a key from the list by id. */
	removeKey: (id: string) => void;
	/** Remove keys for a given creator id (used when it is bookmarked). */
	clear: () => void;
}

export const useRecentlyViewed = create<RecentlyViewedState>()(
	persist(
		(set, get) => ({
			keys: [],

			addKey: key =>
				set(() => {
					const filtered = get().keys.filter(k => k.id !== key.id);
					return {
						keys: [
							{ ...key, viewedAt: Date.now() },
							...filtered,
						].slice(0, RECENTLY_VIEWED_LIMIT),
					};
				}),

			removeKey: id =>
				set(state => ({
					keys: state.keys.filter(k => k.id !== id),
				})),

			clear: () => set({ keys: [] }),
		}),
		{
			name: RECENTLY_VIEWED_STORAGE_KEY,
			storage: createJSONStorage(() => localStorage),
			partialize: state => ({ keys: state.keys }),
		}
	)
);
