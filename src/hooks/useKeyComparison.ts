import { useCallback, useState } from 'react';

export interface ComparisonKey {
	id: string;
	name: string;
}

const MAX_COMPARISON_KEYS = 3;

export interface UseKeyComparisonResult {
	selectedKeys: ComparisonKey[];
	addKey: (key: ComparisonKey) => void;
	removeKey: (id: string) => void;
	clearKeys: () => void;
	canAddMore: boolean;
}

export function useKeyComparison(): UseKeyComparisonResult {
	const [selectedKeys, setSelectedKeys] = useState<ComparisonKey[]>([]);

	const addKey = useCallback((key: ComparisonKey) => {
		setSelectedKeys(prev => {
			if (prev.some(k => k.id === key.id)) return prev;
			if (prev.length >= MAX_COMPARISON_KEYS) {
				return [...prev.slice(1), key];
			}
			return [...prev, key];
		});
	}, []);

	const removeKey = useCallback((id: string) => {
		setSelectedKeys(prev => prev.filter(k => k.id !== id));
	}, []);

	const clearKeys = useCallback(() => {
		setSelectedKeys([]);
	}, []);

	return {
		selectedKeys,
		addKey,
		removeKey,
		clearKeys,
		canAddMore: selectedKeys.length < MAX_COMPARISON_KEYS,
	};
}
