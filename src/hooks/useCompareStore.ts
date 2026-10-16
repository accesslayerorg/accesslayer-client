import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Course } from '@/services/course.service';

export const MAX_COMPARE_KEYS = 3;
export const COMPARE_STORAGE_KEY = 'accesslayer.compare';
export const COMPARE_LIMIT_REASON = `You can compare up to ${MAX_COMPARE_KEYS} keys. Remove one to add another.`;

/**
 * Snapshot of a creator key taken when it is added to the comparison, so
 * the sticky bar can render immediately without refetching.
 */
export interface CompareKey {
	id: string;
	title: string;
	instructorId?: string;
	thumbnail?: string;
	walletAddress?: string;
	price: number;
	priceStroops?: number | null;
	volume24h?: number;
	creatorShareSupply?: number;
}

export function toCompareKey(
	creator: Course & { walletAddress?: string }
): CompareKey {
	return {
		id: creator.id,
		title: creator.title,
		instructorId: creator.instructorId,
		thumbnail: creator.thumbnail,
		walletAddress: creator.walletAddress,
		price: creator.price,
		priceStroops: creator.priceStroops,
		volume24h: creator.volume24h,
		creatorShareSupply: creator.creatorShareSupply,
	};
}

interface CompareStore {
	keys: CompareKey[];
	/** Adds a key; ignored when already selected or the limit is reached. */
	add: (key: CompareKey) => void;
	remove: (id: string) => void;
	clear: () => void;
}

/**
 * Keys selected for side-by-side comparison (#1086). Persisted to
 * sessionStorage so the selection survives navigating to the compare page
 * and reloads, but doesn't linger across browsing sessions.
 */
export const useCompareStore = create<CompareStore>()(
	persist(
		set => ({
			keys: [],
			add: key =>
				set(state =>
					state.keys.length >= MAX_COMPARE_KEYS ||
					state.keys.some(existing => existing.id === key.id)
						? state
						: { keys: [...state.keys, key] }
				),
			remove: id =>
				set(state => ({ keys: state.keys.filter(key => key.id !== id) })),
			clear: () => set({ keys: [] }),
		}),
		{
			name: COMPARE_STORAGE_KEY,
			storage: createJSONStorage(() => sessionStorage),
			partialize: state => ({ keys: state.keys }),
		}
	)
);
