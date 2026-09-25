export interface CacheEntry {
	queryKey: readonly unknown[];
	data: unknown;
	dataUpdatedAt: number;
	queryHash: string;
}

export interface SyncQueueItem {
	id?: number;
	url: string;
	method: string;
	body: string | null;
	queuedAt: number;
}

const DB_NAME = 'accesslayer-query-cache';
const DB_VERSION = 1;
export const QUERIES_STORE = 'queries';
export const SYNC_STORE = 'sync-queue';
export const MAX_AGE_MS = 24 * 60 * 60 * 1000;

function openDB(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, DB_VERSION);

		req.onupgradeneeded = event => {
			const db = (event.target as IDBOpenDBRequest).result;
			if (!db.objectStoreNames.contains(QUERIES_STORE)) {
				db.createObjectStore(QUERIES_STORE, { keyPath: 'queryHash' });
			}
			if (!db.objectStoreNames.contains(SYNC_STORE)) {
				db.createObjectStore(SYNC_STORE, {
					keyPath: 'id',
					autoIncrement: true,
				});
			}
		};

		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

export class IndexedDBCache {
	private dbPromise: Promise<IDBDatabase> | null = null;

	private getDB(): Promise<IDBDatabase> {
		if (!this.dbPromise) this.dbPromise = openDB();
		return this.dbPromise;
	}

	async get(queryHash: string): Promise<CacheEntry | undefined> {
		try {
			const db = await this.getDB();
			return new Promise(resolve => {
				const req = db
					.transaction(QUERIES_STORE, 'readonly')
					.objectStore(QUERIES_STORE)
					.get(queryHash);
				req.onsuccess = () => resolve(req.result as CacheEntry | undefined);
				req.onerror = () => resolve(undefined);
			});
		} catch {
			return undefined;
		}
	}

	async set(queryHash: string, entry: CacheEntry): Promise<void> {
		try {
			const db = await this.getDB();
			await new Promise<void>((resolve, reject) => {
				const tx = db.transaction(QUERIES_STORE, 'readwrite');
				tx.objectStore(QUERIES_STORE).put({ ...entry, queryHash });
				tx.oncomplete = () => resolve();
				tx.onerror = () => reject(tx.error);
			});
		} catch {
			// fall back silently to in-memory cache
		}
	}

	async delete(queryHash: string): Promise<void> {
		try {
			const db = await this.getDB();
			await new Promise<void>(resolve => {
				const tx = db.transaction(QUERIES_STORE, 'readwrite');
				tx.objectStore(QUERIES_STORE).delete(queryHash);
				tx.oncomplete = () => resolve();
				tx.onerror = () => resolve();
			});
		} catch {
			// silently ignore
		}
	}

	async clear(): Promise<void> {
		try {
			const db = await this.getDB();
			await new Promise<void>(resolve => {
				const tx = db.transaction(QUERIES_STORE, 'readwrite');
				tx.objectStore(QUERIES_STORE).clear();
				tx.oncomplete = () => resolve();
				tx.onerror = () => resolve();
			});
		} catch {
			// silently ignore
		}
	}

	async getAll(): Promise<CacheEntry[]> {
		try {
			const db = await this.getDB();
			return new Promise(resolve => {
				const req = db
					.transaction(QUERIES_STORE, 'readonly')
					.objectStore(QUERIES_STORE)
					.getAll();
				req.onsuccess = () => resolve(req.result as CacheEntry[]);
				req.onerror = () => resolve([]);
			});
		} catch {
			return [];
		}
	}

	async evictStale(maxAgeMs = MAX_AGE_MS): Promise<void> {
		try {
			const entries = await this.getAll();
			const cutoff = Date.now() - maxAgeMs;
			await Promise.all(
				entries
					.filter(e => e.dataUpdatedAt < cutoff)
					.map(e => this.delete(e.queryHash))
			);
		} catch {
			// silently ignore
		}
	}
}

export const indexedDBCache = new IndexedDBCache();
