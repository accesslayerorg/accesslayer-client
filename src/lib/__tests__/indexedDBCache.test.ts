import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CacheEntry } from '@/lib/indexedDBCache';
import { IndexedDBCache } from '@/lib/indexedDBCache';

// ---------------------------------------------------------------------------
// Minimal in-memory IDBDatabase stub
// ---------------------------------------------------------------------------

type Row = CacheEntry;

function makeIDBStub() {
	const stores: Record<string, Map<string, Row>> = {
		queries: new Map(),
		'sync-queue': new Map(),
	};

	function makeRequest<T>(resultFn: () => T): IDBRequest<T> {
		const req = { result: undefined as T, error: null } as unknown as IDBRequest<T>;
		Promise.resolve().then(() => {
			(req as unknown as { result: T }).result = resultFn();
			(req as unknown as { onsuccess: ((e: Event) => void) | null }).onsuccess?.({} as Event);
		});
		return req;
	}

	function makeStore(storeName: string) {
		const store = stores[storeName];
		return {
			get: (key: string) => makeRequest(() => store.get(key) as unknown as Row),
			put: (val: Row) => {
				store.set(String(val.queryHash), val);
				return makeRequest(() => undefined as unknown as Row);
			},
			delete: (key: string) => {
				store.delete(key);
				return makeRequest(() => undefined as unknown as Row);
			},
			clear: () => {
				store.clear();
				return makeRequest(() => undefined as unknown as Row);
			},
			getAll: () => makeRequest(() => [...store.values()] as unknown as Row),
		};
	}

	function makeTx(storeNames: string | string[]) {
		const names = Array.isArray(storeNames) ? storeNames : [storeNames];
		const txStores: Record<string, ReturnType<typeof makeStore>> = {};
		for (const n of names) txStores[n] = makeStore(n);

		const tx = {
			objectStore: (n: string) => txStores[n],
			oncomplete: null as (() => void) | null,
			onerror: null as (() => void) | null,
			error: null,
		};
		// Fire oncomplete on next microtask
		Promise.resolve().then(() => tx.oncomplete?.());
		return tx;
	}

	const db = {
		transaction: (stores: string | string[]) => makeTx(stores),
		objectStoreNames: { contains: (n: string) => n in stores },
	};

	return { db, stores };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('IndexedDBCache', () => {
	let cache: IndexedDBCache;
	let stores: ReturnType<typeof makeIDBStub>['stores'];

	function entry(hash: string, updatedAt = Date.now()): CacheEntry {
		return {
			queryHash: hash,
			queryKey: ['test', hash],
			data: { value: hash },
			dataUpdatedAt: updatedAt,
		};
	}

	beforeEach(() => {
		const stub = makeIDBStub();
		stores = stub.stores;

		const mockOpen = vi.fn().mockImplementation(() => {
			const req = {
				result: stub.db,
				error: null,
				onupgradeneeded: null as ((e: Event) => void) | null,
				onsuccess: null as ((e: Event) => void) | null,
				onerror: null as ((e: Event) => void) | null,
			};
			Promise.resolve().then(() =>
				req.onsuccess?.({ target: req } as unknown as Event)
			);
			return req;
		});

		vi.stubGlobal('indexedDB', { open: mockOpen });

		cache = new IndexedDBCache();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe('get', () => {
		it('returns undefined for a key that does not exist', async () => {
			expect(await cache.get('missing')).toBeUndefined();
		});

		it('returns the entry for a key that was set', async () => {
			const e = entry('abc');
			stores.queries.set('abc', e);
			const result = await cache.get('abc');
			expect(result?.queryHash).toBe('abc');
		});

		it('returns undefined and does not throw when IndexedDB errors', async () => {
			vi.stubGlobal('indexedDB', {
				open: vi.fn().mockImplementation(() => {
					const req = {
						error: new Error('IDB error'),
						onupgradeneeded: null,
						onsuccess: null,
						onerror: null as ((e: Event) => void) | null,
					};
					Promise.resolve().then(() =>
						req.onerror?.({} as Event)
					);
					return req;
				}),
			});
			const failCache = new IndexedDBCache();
			await expect(failCache.get('key')).resolves.toBeUndefined();
		});
	});

	describe('set', () => {
		it('stores an entry retrievable by get', async () => {
			const e = entry('xyz');
			await cache.set('xyz', e);
			const stored = stores.queries.get('xyz');
			expect(stored?.queryHash).toBe('xyz');
		});

		it('does not throw when IndexedDB errors', async () => {
			vi.stubGlobal('indexedDB', {
				open: vi.fn().mockImplementation(() => {
					const req = {
						error: new Error('fail'),
						onupgradeneeded: null,
						onsuccess: null,
						onerror: null as ((e: Event) => void) | null,
					};
					Promise.resolve().then(() => req.onerror?.({} as Event));
					return req;
				}),
			});
			const failCache = new IndexedDBCache();
			await expect(failCache.set('k', entry('k'))).resolves.toBeUndefined();
		});
	});

	describe('delete', () => {
		it('removes an existing entry', async () => {
			stores.queries.set('del', entry('del'));
			await cache.delete('del');
			expect(stores.queries.has('del')).toBe(false);
		});

		it('is a no-op for a key that does not exist', async () => {
			await expect(cache.delete('nonexistent')).resolves.toBeUndefined();
		});
	});

	describe('clear', () => {
		it('removes all entries from the store', async () => {
			stores.queries.set('a', entry('a'));
			stores.queries.set('b', entry('b'));
			await cache.clear();
			expect(stores.queries.size).toBe(0);
		});
	});

	describe('getAll', () => {
		it('returns an empty array when the store is empty', async () => {
			expect(await cache.getAll()).toEqual([]);
		});

		it('returns all stored entries', async () => {
			stores.queries.set('p', entry('p'));
			stores.queries.set('q', entry('q'));
			const all = await cache.getAll();
			expect(all.map(e => e.queryHash).sort()).toEqual(['p', 'q']);
		});
	});

	describe('evictStale', () => {
		it('removes entries older than maxAgeMs', async () => {
			const old = entry('old', Date.now() - 200);
			const fresh = entry('fresh', Date.now());
			stores.queries.set('old', old);
			stores.queries.set('fresh', fresh);

			await cache.evictStale(100);

			expect(stores.queries.has('old')).toBe(false);
			expect(stores.queries.has('fresh')).toBe(true);
		});

		it('keeps all entries when none are stale', async () => {
			stores.queries.set('a', entry('a', Date.now()));
			stores.queries.set('b', entry('b', Date.now()));
			await cache.evictStale(60_000);
			expect(stores.queries.size).toBe(2);
		});

		it('removes all entries when all are stale', async () => {
			stores.queries.set('x', entry('x', 0));
			stores.queries.set('y', entry('y', 1));
			await cache.evictStale(100);
			expect(stores.queries.size).toBe(0);
		});
	});
});
