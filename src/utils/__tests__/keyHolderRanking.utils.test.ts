import { describe, expect, it } from 'vitest';
import { rankKeyHolders, type KeyHolder } from '@/utils/keyHolderRanking.utils';

function holder(id: string, keyCount: number): KeyHolder {
	return { id, displayName: `Holder ${id}`, keyCount };
}

describe('rankKeyHolders', () => {
	it('sorts a list of three holders descending by key count', () => {
		const ranked = rankKeyHolders([holder('a', 5), holder('b', 20), holder('c', 10)]);
		expect(ranked.map(h => h.id)).toEqual(['b', 'c', 'a']);
	});

	it('assigns sequential ranks 1, 2, 3 in the sorted order', () => {
		const ranked = rankKeyHolders([holder('a', 5), holder('b', 20), holder('c', 10)]);
		expect(ranked.map(h => h.rank)).toEqual([1, 2, 3]);
	});

	it('computes share percentages that sum to 100% across all holders', () => {
		const ranked = rankKeyHolders([holder('a', 30), holder('b', 50), holder('c', 20)]);
		const total = ranked.reduce((sum, h) => sum + h.sharePercent, 0);
		expect(total).toBeCloseTo(100, 10);
	});

	it('gives a single holder with all keys a 100% share', () => {
		const ranked = rankKeyHolders([holder('a', 42)]);
		expect(ranked).toHaveLength(1);
		expect(ranked[0]!.sharePercent).toBe(100);
		expect(ranked[0]!.rank).toBe(1);
	});

	it('renders a tie in key count at the same rank', () => {
		const ranked = rankKeyHolders([holder('a', 10), holder('b', 10), holder('c', 5)]);
		const [first, second, third] = ranked;

		expect(first!.keyCount).toBe(10);
		expect(second!.keyCount).toBe(10);
		expect(first!.rank).toBe(1);
		expect(second!.rank).toBe(1);
		// Competition ranking: the next distinct count resumes at its
		// 1-indexed position (3rd), not incrementing by 1 (2nd).
		expect(third!.rank).toBe(3);
	});

	it('splits share percentage evenly between exactly tied holders', () => {
		const ranked = rankKeyHolders([holder('a', 10), holder('b', 10)]);
		expect(ranked[0]!.sharePercent).toBe(50);
		expect(ranked[1]!.sharePercent).toBe(50);
	});

	it('handles three-way ties by giving the following holder rank 4', () => {
		const ranked = rankKeyHolders([
			holder('a', 10),
			holder('b', 10),
			holder('c', 10),
			holder('d', 5),
		]);
		expect(ranked.map(h => h.rank)).toEqual([1, 1, 1, 4]);
	});

	it('returns an empty array for an empty holder list', () => {
		expect(rankKeyHolders([])).toEqual([]);
	});

	it('does not mutate the input array', () => {
		const input = [holder('a', 5), holder('b', 20)];
		const inputCopy = [...input];
		rankKeyHolders(input);
		expect(input).toEqual(inputCopy);
	});
});

describe('rankKeyHolders staking split (#814)', () => {
	it('defaults stakedQuantity to 0 and liquidQuantity to keyCount when absent', () => {
		const [entry] = rankKeyHolders([holder('a', 12)]);
		expect(entry!.stakedQuantity).toBe(0);
		expect(entry!.liquidQuantity).toBe(12);
	});

	it('splits keyCount into staked and liquid portions', () => {
		const [entry] = rankKeyHolders([
			{ id: 'a', displayName: 'A', keyCount: 20, stakedQuantity: 8 },
		]);
		expect(entry!.stakedQuantity).toBe(8);
		expect(entry!.liquidQuantity).toBe(12);
	});

	it('ranks a fully staked holder by total quantity, not liquid quantity', () => {
		const ranked = rankKeyHolders([
			{ id: 'liquid', displayName: 'Liquid', keyCount: 15, stakedQuantity: 0 },
			{ id: 'staked', displayName: 'Staked', keyCount: 30, stakedQuantity: 30 },
		]);
		expect(ranked.map(h => h.id)).toEqual(['staked', 'liquid']);
		expect(ranked[0]!.rank).toBe(1);
		expect(ranked[0]!.liquidQuantity).toBe(0);
	});

	it('clamps a staked value larger than keyCount and never yields negative liquid', () => {
		const [entry] = rankKeyHolders([
			{ id: 'a', displayName: 'A', keyCount: 10, stakedQuantity: 999 },
		]);
		expect(entry!.stakedQuantity).toBe(10);
		expect(entry!.liquidQuantity).toBe(0);
	});

	it('treats a negative or non-finite staked value as 0', () => {
		const [neg] = rankKeyHolders([
			{ id: 'a', displayName: 'A', keyCount: 10, stakedQuantity: -4 },
		]);
		expect(neg!.stakedQuantity).toBe(0);
		expect(neg!.liquidQuantity).toBe(10);
	});
});
