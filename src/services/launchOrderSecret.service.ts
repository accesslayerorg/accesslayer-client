import type { LaunchOrderSecret } from '@/utils/launchCommitReveal.utils';

const DB_NAME = 'accesslayer-launch-order-secrets';
const DB_VERSION = 1;
const STORE_NAME = 'secrets';

function getStorageKey(keyId: string, walletAddress: string): string {
	return JSON.stringify([keyId, walletAddress.trim().toLowerCase()]);
}

function openDatabase(): Promise<IDBDatabase> {
	if (!globalThis.indexedDB) {
		return Promise.reject(
			new Error('Browser storage is unavailable; your launch salt cannot be saved.')
		);
	}

	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);
		request.onupgradeneeded = () => {
			const database = request.result;
			if (!database.objectStoreNames.contains(STORE_NAME)) {
				database.createObjectStore(STORE_NAME, { keyPath: 'storageKey' });
			}
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () =>
			reject(request.error ?? new Error('Unable to open launch order storage.'));
		request.onblocked = () =>
			reject(new Error('Launch order storage is blocked by another tab.'));
	});
}

function withStore<T>(
	mode: IDBTransactionMode,
	run: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
	return openDatabase().then(
		database =>
			new Promise<T>((resolve, reject) => {
				const transaction = database.transaction(STORE_NAME, mode);
				const request = run(transaction.objectStore(STORE_NAME));
				const fail = (error: DOMException | null, message: string) => {
					database.close();
					reject(error ?? new Error(message));
				};
				request.onerror = () =>
					fail(
						request.error,
						'Unable to access the saved launch order.'
					);
				transaction.onabort = () =>
					fail(
						transaction.error,
						'Launch order storage transaction was aborted.'
					);
				transaction.onerror = () =>
					fail(transaction.error, 'Launch order storage transaction failed.');
				transaction.oncomplete = () => {
					database.close();
					resolve(request.result);
				};
			})
	);
}

interface StoredLaunchOrderSecret extends LaunchOrderSecret {
	storageKey: string;
}

export async function getLaunchOrderSecret(
	keyId: string,
	walletAddress: string
): Promise<LaunchOrderSecret | null> {
	const stored = await withStore<StoredLaunchOrderSecret | undefined>(
		'readonly',
		store => store.get(getStorageKey(keyId, walletAddress))
	);
	if (!stored) return null;
	const { storageKey: _storageKey, ...secret } = stored;
	return secret;
}

export function saveLaunchOrderSecret(
	secret: LaunchOrderSecret
): Promise<unknown> {
	return withStore<IDBValidKey>('readwrite', store =>
		store.put({
			...secret,
			storageKey: getStorageKey(secret.keyId, secret.walletAddress),
		} satisfies StoredLaunchOrderSecret)
	);
}
