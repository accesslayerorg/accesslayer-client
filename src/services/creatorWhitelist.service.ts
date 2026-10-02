// src/services/creatorWhitelist.service.ts
import { BaseApiService, type APIResponse } from './api.service';
import { cacheManager } from '@/utils/cache.utils';
import type { WhitelistEntry } from './course.service';

export type { WhitelistEntry };

export interface CreatorWhitelistConfig {
	keyId: string;
	isWhitelistEnabled: boolean;
	entries: WhitelistEntry[];
}

const WHITELIST_CACHE_TTL = 30_000;

export function whitelistCacheKey(keyId: string): string {
	return `whitelist_${keyId}`;
}

class CreatorWhitelistService extends BaseApiService {
	/**
	 * In-memory state for dev and testing before backend endpoints land.
	 */
	private localStore = new Map<string, CreatorWhitelistConfig>();

	/**
	 * Initializes or retrieves the whitelist configuration for a key.
	 */
	async getWhitelist(
		keyId: string,
		initialData?: { isWhitelistEnabled?: boolean; entries?: WhitelistEntry[] }
	): Promise<CreatorWhitelistConfig> {
		const cacheKey = whitelistCacheKey(keyId);
		const cached = cacheManager.get<CreatorWhitelistConfig>(cacheKey);
		if (cached) return cached;

		try {
			const response = await this.api.get<
				APIResponse<CreatorWhitelistConfig>
			>(`/keys/${keyId}/whitelist`);
			const data = response.data.data;
			cacheManager.set(cacheKey, data, WHITELIST_CACHE_TTL);
			this.localStore.set(keyId, data);
			return data;
		} catch {
			// Fallback to local store or initial data if API not available
			let current = this.localStore.get(keyId);
			if (!current) {
				current = {
					keyId,
					isWhitelistEnabled: initialData?.isWhitelistEnabled ?? true,
					entries: initialData?.entries ?? [],
				};
				this.localStore.set(keyId, current);
			} else if (initialData?.entries && current.entries.length === 0) {
				current.entries = initialData.entries;
			}
			cacheManager.set(cacheKey, current, WHITELIST_CACHE_TTL);
			return current;
		}
	}

	/**
	 * Adds approved wallet addresses to the creator's early access whitelist.
	 * POST /keys/:keyId/whitelist
	 */
	async addAddresses(
		keyId: string,
		addresses: string[]
	): Promise<CreatorWhitelistConfig> {
		const cacheKey = whitelistCacheKey(keyId);
		try {
			const response = await this.api.post<
				APIResponse<CreatorWhitelistConfig>
			>(`/keys/${keyId}/whitelist`, { addresses });
			const data = response.data.data;
			cacheManager.set(cacheKey, data, WHITELIST_CACHE_TTL);
			this.localStore.set(keyId, data);
			return data;
		} catch {
			// Update local fallback store
			const current = await this.getWhitelist(keyId);
			const now = new Date().toISOString();
			const existingWallets = new Set(
				current.entries.map(e => e.walletAddress.toUpperCase())
			);

			const newEntries: WhitelistEntry[] = [];
			for (const addr of addresses) {
				if (!existingWallets.has(addr.toUpperCase())) {
					existingWallets.add(addr.toUpperCase());
					newEntries.push({ walletAddress: addr, addedAt: now });
				}
			}

			const updated: CreatorWhitelistConfig = {
				...current,
				entries: [...current.entries, ...newEntries],
			};
			this.localStore.set(keyId, updated);
			cacheManager.set(cacheKey, updated, WHITELIST_CACHE_TTL);
			return updated;
		}
	}

	/**
	 * Removes a wallet address from the creator's early access whitelist.
	 * DELETE /keys/:keyId/whitelist/:address
	 */
	async removeAddress(
		keyId: string,
		address: string
	): Promise<CreatorWhitelistConfig> {
		const cacheKey = whitelistCacheKey(keyId);
		try {
			const response = await this.api.delete<
				APIResponse<CreatorWhitelistConfig>
			>(`/keys/${keyId}/whitelist/${address}`);
			const data = response.data.data;
			cacheManager.set(cacheKey, data, WHITELIST_CACHE_TTL);
			this.localStore.set(keyId, data);
			return data;
		} catch {
			const current = await this.getWhitelist(keyId);
			const updated: CreatorWhitelistConfig = {
				...current,
				entries: current.entries.filter(
					e => e.walletAddress.toUpperCase() !== address.toUpperCase()
				),
			};
			this.localStore.set(keyId, updated);
			cacheManager.set(cacheKey, updated, WHITELIST_CACHE_TTL);
			return updated;
		}
	}

	/**
	 * Disables the early access whitelist gate permanently (irreversible).
	 * POST /keys/:keyId/whitelist/disable
	 */
	async disableWhitelist(keyId: string): Promise<CreatorWhitelistConfig> {
		const cacheKey = whitelistCacheKey(keyId);
		try {
			const response = await this.api.post<
				APIResponse<CreatorWhitelistConfig>
			>(`/keys/${keyId}/whitelist/disable`);
			const data = response.data.data;
			cacheManager.set(cacheKey, data, WHITELIST_CACHE_TTL);
			this.localStore.set(keyId, data);
			return data;
		} catch {
			const current = await this.getWhitelist(keyId);
			const updated: CreatorWhitelistConfig = {
				...current,
				isWhitelistEnabled: false,
			};
			this.localStore.set(keyId, updated);
			cacheManager.set(cacheKey, updated, WHITELIST_CACHE_TTL);
			return updated;
		}
	}

	/** Clears local cache and store (useful in test teardown). */
	clearLocalStore(): void {
		this.localStore.clear();
	}
}

export const creatorWhitelistService = new CreatorWhitelistService();
