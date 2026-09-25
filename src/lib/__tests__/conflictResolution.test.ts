import { describe, expect, it } from 'vitest';
import { resolveConflict } from '@/lib/conflictResolution';
import type { ConflictEntry } from '@/lib/conflictResolution';

function entry(data: Record<string, unknown>, updatedAt: number): ConflictEntry {
	return { data, dataUpdatedAt: updatedAt };
}

describe('resolveConflict', () => {
	describe('when server data is newer', () => {
		it('returns server data when there are no optimistic fields', () => {
			const local = entry({ name: 'Alice', score: 10 }, 1000);
			const server = entry({ name: 'Alice', score: 20 }, 2000);

			const result = resolveConflict(local, server);

			expect(result).toEqual(server);
		});

		it('preserves optimistic fields from local entry', () => {
			const local = entry({ name: 'Alice', positions: [{ id: 1 }] }, 1000);
			const server = entry({ name: 'Alice Updated', positions: [] }, 2000);

			const result = resolveConflict(local, server, {
				optimisticFields: ['positions'],
			});

			expect(result.data.name).toBe('Alice Updated');
			expect(result.data.positions).toEqual([{ id: 1 }]);
			expect(result.dataUpdatedAt).toBe(2000);
		});

		it('preserves multiple optimistic fields', () => {
			const local = entry(
				{ title: 'Old', positions: [1, 2], balance: 99 },
				500
			);
			const server = entry(
				{ title: 'New', positions: [], balance: 50 },
				1500
			);

			const result = resolveConflict(local, server, {
				optimisticFields: ['positions', 'balance'],
			});

			expect(result.data.title).toBe('New');
			expect(result.data.positions).toEqual([1, 2]);
			expect(result.data.balance).toBe(99);
		});

		it('ignores an optimistic field that does not exist in local data', () => {
			const local = entry({ name: 'Alice' }, 1000);
			const server = entry({ name: 'Bob', score: 5 }, 2000);

			const result = resolveConflict(local, server, {
				optimisticFields: ['score'],
			});

			expect(result.data.score).toBe(5);
			expect(result.data.name).toBe('Bob');
		});

		it('stamps the result with the server dataUpdatedAt', () => {
			const local = entry({ a: 1 }, 1000);
			const server = entry({ a: 2 }, 3000);

			const result = resolveConflict(local, server, {
				optimisticFields: ['a'],
			});

			expect(result.dataUpdatedAt).toBe(3000);
		});
	});

	describe('when local data is newer or equal', () => {
		it('returns the local entry when local is newer', () => {
			const local = entry({ name: 'Alice', score: 50 }, 3000);
			const server = entry({ name: 'Alice', score: 10 }, 1000);

			const result = resolveConflict(local, server);

			expect(result).toEqual(local);
		});

		it('returns the local entry when timestamps are equal', () => {
			const local = entry({ value: 'local' }, 1000);
			const server = entry({ value: 'server' }, 1000);

			const result = resolveConflict(local, server);

			expect(result).toEqual(local);
		});

		it('ignores optimistic fields when local is newer', () => {
			const local = entry({ positions: [1, 2, 3] }, 5000);
			const server = entry({ positions: [] }, 2000);

			const result = resolveConflict(local, server, {
				optimisticFields: ['positions'],
			});

			expect(result.data.positions).toEqual([1, 2, 3]);
			expect(result.dataUpdatedAt).toBe(5000);
		});
	});

	describe('edge cases', () => {
		it('handles empty optimistic fields array the same as no options', () => {
			const local = entry({ x: 1 }, 1000);
			const server = entry({ x: 2 }, 2000);

			const withEmpty = resolveConflict(local, server, { optimisticFields: [] });
			const withDefault = resolveConflict(local, server);

			expect(withEmpty).toEqual(withDefault);
		});

		it('does not mutate the input entries', () => {
			const local = entry({ a: 1, b: 2 }, 1000);
			const server = entry({ a: 10, b: 20 }, 2000);

			const localCopy = JSON.parse(JSON.stringify(local)) as ConflictEntry;
			const serverCopy = JSON.parse(JSON.stringify(server)) as ConflictEntry;

			resolveConflict(local, server, { optimisticFields: ['a'] });

			expect(local).toEqual(localCopy);
			expect(server).toEqual(serverCopy);
		});
	});
});
