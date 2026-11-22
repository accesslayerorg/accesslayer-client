import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface ComparisonKey {
	id: string;
	name: string;
}

export const MAX_COMPARISON_KEYS = 3;
export const KEY_COMPARISON_STORAGE_KEY = 'accesslayer.key-comparison';

interface KeyComparisonState {
	selectedKeys: ComparisonKey[];
	addKey: (key: ComparisonKey) => void;
	removeKey: (id: string) => void;
	clearKeys: () => void;
	setKeys: (keys: ComparisonKey[]) => void;
}

/**
 * Shared comparison selection (#1247). Persisted to sessionStorage so the
 * add-to-compare buttons and the /compare page see the same keys.
 * Adding a 4th key drops the oldest selection.
 */
export const useKeyComparisonStore = create<KeyComparisonState>()(
	persist(
		set => ({
			selectedKeys: [],
			addKey: key =>
				set(state => {
					if (state.selectedKeys.some(k => k.id === key.id)) return state;
					if (state.selectedKeys.length >= MAX_COMPARISON_KEYS) {
						return { selectedKeys: [...state.selectedKeys.slice(1), key] };
					}
					return { selectedKeys: [...state.selectedKeys, key] };
				}),
			removeKey: id =>
				set(state => ({
					selectedKeys: state.selectedKeys.filter(k => k.id !== id),
				})),
			clearKeys: () => set({ selectedKeys: [] }),
			setKeys: keys => {
				const seen = new Set<string>();
				const unique: ComparisonKey[] = [];
				for (const k of keys) {
					if (seen.has(k.id)) continue;
					seen.add(k.id);
					unique.push(k);
				}
				set({ selectedKeys: unique.slice(0, MAX_COMPARISON_KEYS) });
			},
		}),
		{
			name: KEY_COMPARISON_STORAGE_KEY,
			storage: createJSONStorage(() => sessionStorage),
			partialize: state => ({ selectedKeys: state.selectedKeys }),
		}
	)
);

export interface UseKeyComparisonResult {
	selectedKeys: ComparisonKey[];
	addKey: (key: ComparisonKey) => void;
	removeKey: (id: string) => void;
	clearKeys: () => void;
	canAddMore: boolean;
}

export function useKeyComparison(): UseKeyComparisonResult {
	const selectedKeys = useKeyComparisonStore(s => s.selectedKeys);
	const addKey = useKeyComparisonStore(s => s.addKey);
	const removeKey = useKeyComparisonStore(s => s.removeKey);
	const clearKeys = useKeyComparisonStore(s => s.clearKeys);

	return {
		selectedKeys,
		addKey,
		removeKey,
		clearKeys,
		canAddMore: selectedKeys.length < MAX_COMPARISON_KEYS,
	};
}
