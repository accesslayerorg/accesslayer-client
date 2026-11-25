const PREFIX = 'accesslayer:';

function storage(): Storage | undefined {
	try {
		return globalThis.localStorage;
	} catch {
		return undefined;
	}
}

export function readLocalCollection<T>(key: string, seed: () => T[]): T[] {
	const store = storage();
	if (!store) return seed();

	try {
		const raw = store.getItem(`${PREFIX}${key}`);
		if (raw) {
			const parsed: unknown = JSON.parse(raw);
			if (Array.isArray(parsed)) return parsed as T[];
		}
	} catch {
		return seed();
	}

	const seeded = seed();
	writeLocalCollection(key, seeded);
	return seeded;
}

export function writeLocalCollection<T>(key: string, value: T[]): void {
	const store = storage();
	if (!store) return;

	try {
		store.setItem(`${PREFIX}${key}`, JSON.stringify(value));
	} catch {
		return;
	}
}

export function resetLocalCollection(key: string): void {
	try {
		storage()?.removeItem(`${PREFIX}${key}`);
	} catch {
		return;
	}
}
