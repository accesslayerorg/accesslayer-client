import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
	useKeyComparison,
	useKeyComparisonStore,
} from '../useKeyComparison';

describe('useKeyComparison (#1247)', () => {
	beforeEach(() => {
		useKeyComparisonStore.setState({ selectedKeys: [] });
	});

	it('caps at 3 keys, dropping the oldest, and ignores duplicates', () => {
		const { result } = renderHook(() => useKeyComparison());
		act(() => {
			['1', '2', '3', '3', '4'].forEach(id =>
				result.current.addKey({ id, name: `K${id}` })
			);
		});
		expect(result.current.selectedKeys.map(k => k.id)).toEqual(['2', '3', '4']);
		expect(result.current.canAddMore).toBe(false);
	});

	it('removes one key and clears all', () => {
		const { result } = renderHook(() => useKeyComparison());
		act(() => {
			result.current.addKey({ id: '1', name: 'A' });
			result.current.addKey({ id: '2', name: 'B' });
		});
		act(() => result.current.removeKey('1'));
		expect(result.current.selectedKeys.map(k => k.id)).toEqual(['2']);
		act(() => result.current.clearKeys());
		expect(result.current.selectedKeys).toEqual([]);
		expect(result.current.canAddMore).toBe(true);
	});
});
