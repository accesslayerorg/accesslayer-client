interface CacheEntry<T> {
	data: T;
	timestamp: number;
	ttl: number;
}

class CacheManager {
	private cache = new Map<string, CacheEntry<unknown>>();

	set<T>(key: string, data: T, ttlMs: number): void {
		this.cache.set(key, {
			data,
			timestamp: Date.now(),
			ttl: ttlMs,
		});
	}

	get<T>(key: string): T | null {
		const entry = this.cache.get(key) as CacheEntry<T> | undefined;
		if (!entry) return null;

		const isExpired = Date.now() - entry.timestamp > entry.ttl;
		if (isExpired) {
			this.cache.delete(key);
			return null;
		}

		return entry.data;
	}

	invalidate(key: string): void {
		this.cache.delete(key);
	}

	invalidateAll(): void {
		this.cache.clear();
	}
}

export const cacheManager = new CacheManager();
