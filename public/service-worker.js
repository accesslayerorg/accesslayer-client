/**
 * Access Layer service worker — background sync for creator profile and
 * portfolio endpoints (Issue #754).
 *
 * Intercepts failed GET requests during offline periods, queues them in
 * IndexedDB, then replays them when connectivity is restored via the
 * Background Sync API.
 */

const SYNC_TAG = 'api-retry';
const DB_NAME = 'accesslayer-query-cache';
const DB_VERSION = 1;
const QUERIES_STORE = 'queries';
const SYNC_STORE = 'sync-queue';
const MAX_QUEUE_AGE_MS = 60 * 60 * 1000; // 1 hour

const INTERCEPTED_PATHS = ['/api/creators/', '/api/wallet/'];

// ---------------------------------------------------------------------------
// IndexedDB helpers (duplicated from the main-thread adapter so the SW is
// self-contained and does not import ES modules).
// ---------------------------------------------------------------------------

function openDB() {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, DB_VERSION);
		req.onupgradeneeded = event => {
			const db = event.target.result;
			if (!db.objectStoreNames.contains(QUERIES_STORE)) {
				db.createObjectStore(QUERIES_STORE, { keyPath: 'queryHash' });
			}
			if (!db.objectStoreNames.contains(SYNC_STORE)) {
				db.createObjectStore(SYNC_STORE, { keyPath: 'id', autoIncrement: true });
			}
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

async function enqueueRequest(url, method, body) {
	try {
		const db = await openDB();
		await new Promise((resolve, reject) => {
			const tx = db.transaction(SYNC_STORE, 'readwrite');
			tx.objectStore(SYNC_STORE).add({ url, method, body: body ?? null, queuedAt: Date.now() });
			tx.oncomplete = () => resolve();
			tx.onerror = () => reject(tx.error);
		});
	} catch {
		// silently ignore — offline queuing is best-effort
	}
}

async function drainQueue() {
	try {
		const db = await openDB();

		const items = await new Promise((resolve, reject) => {
			const req = db.transaction(SYNC_STORE, 'readonly').objectStore(SYNC_STORE).getAll();
			req.onsuccess = () => resolve(req.result);
			req.onerror = () => reject(req.error);
		});

		const now = Date.now();

		for (const item of items) {
			// Discard items older than 1 hour without replaying.
			if (now - item.queuedAt > MAX_QUEUE_AGE_MS) {
				await deleteQueueItem(db, item.id);
				continue;
			}

			try {
				const init = { method: item.method };
				if (item.body) init.body = item.body;

				const response = await fetch(item.url, init);
				if (response.ok) {
					const data = await response.json();
					await updateQueryCache(db, item.url, data);
					await deleteQueueItem(db, item.id);
				}
			} catch {
				// Network still unavailable for this item — leave it queued.
			}
		}
	} catch {
		// silently ignore
	}
}

async function deleteQueueItem(db, id) {
	return new Promise(resolve => {
		const tx = db.transaction(SYNC_STORE, 'readwrite');
		tx.objectStore(SYNC_STORE).delete(id);
		tx.oncomplete = () => resolve();
		tx.onerror = () => resolve();
	});
}

async function updateQueryCache(db, url, data) {
	try {
		const queryHash = url;
		const entry = {
			queryKey: [url],
			data,
			dataUpdatedAt: Date.now(),
			queryHash,
		};
		await new Promise((resolve, reject) => {
			const tx = db.transaction(QUERIES_STORE, 'readwrite');
			tx.objectStore(QUERIES_STORE).put(entry);
			tx.oncomplete = () => resolve();
			tx.onerror = () => reject(tx.error);
		});
	} catch {
		// silently ignore
	}
}

// ---------------------------------------------------------------------------
// Service Worker lifecycle
// ---------------------------------------------------------------------------

self.addEventListener('install', () => {
	self.skipWaiting();
});

self.addEventListener('activate', event => {
	event.waitUntil(self.clients.claim());
});

// ---------------------------------------------------------------------------
// Fetch interception — queue failed requests to the tracked endpoints.
// ---------------------------------------------------------------------------

self.addEventListener('fetch', event => {
	const { request } = event;
	if (request.method !== 'GET') return;

	const url = new URL(request.url);
	const isTracked = INTERCEPTED_PATHS.some(p => url.pathname.startsWith(p));
	if (!isTracked) return;

	event.respondWith(
		fetch(request).catch(async err => {
			await enqueueRequest(request.url, request.method, null);

			// Register background sync so the queue is drained once online.
			if ('sync' in self.registration) {
				try {
					await self.registration.sync.register(SYNC_TAG);
				} catch {
					// Background Sync API not available — queue will drain on
					// the next successful fetch.
				}
			}

			throw err;
		})
	);
});

// ---------------------------------------------------------------------------
// Background Sync — drain the queue when connectivity is restored.
// ---------------------------------------------------------------------------

self.addEventListener('sync', event => {
	if (event.tag === SYNC_TAG) {
		event.waitUntil(drainQueue());
	}
});
