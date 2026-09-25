// src/services/search.service.ts
import { BaseApiService, type APIResponse } from './api.service';
import { cacheManager } from '@/utils/cache.utils';
import type { ProposalStatus } from '@/types/governance';

export interface SearchKeyItem {
	id: string;
	title: string;
	price?: number;
	priceStroops?: number;
	thumbnail?: string;
	creatorId?: string;
	category?: string;
	change24h?: number;
	symbol?: string;
	volume24h?: number;
}

export interface SearchCreatorItem {
	id: string;
	name?: string;
	title?: string;
	socialHandle?: string;
	avatarUri?: string;
	thumbnail?: string;
	bio?: string;
	isVerified?: boolean;
	category?: string;
}

export interface SearchProposalItem {
	id: string;
	title: string;
	description?: string;
	status: ProposalStatus;
	creatorId?: string;
	quorumBps?: number;
	startDate?: string;
	endDate?: string;
}

export interface GlobalSearchResults {
	keys: SearchKeyItem[];
	creators: SearchCreatorItem[];
	proposals: SearchProposalItem[];
}

const SEARCH_CACHE_TTL = 15_000; // 15 seconds

class SearchService extends BaseApiService {
	/**
	 * Search across keys, creators, and governance proposals.
	 * GET /search?q=:query
	 */
	async search(query: string): Promise<GlobalSearchResults> {
		const trimmed = query.trim();
		if (!trimmed) {
			return { keys: [], creators: [], proposals: [] };
		}

		const cacheKey = `global_search_${trimmed.toLowerCase()}`;
		const cached = cacheManager.get<GlobalSearchResults>(cacheKey);
		if (cached) return cached;

		try {
			const response = await this.api.get<
				APIResponse<GlobalSearchResults | { results: GlobalSearchResults }>
			>('/search', {
				params: { q: trimmed },
			});

			const raw = response.data.data;
			let result: GlobalSearchResults = { keys: [], creators: [], proposals: [] };

			if (raw && typeof raw === 'object') {
				if ('results' in raw && raw.results && typeof raw.results === 'object') {
					result = {
						keys: Array.isArray(raw.results.keys) ? raw.results.keys : [],
						creators: Array.isArray(raw.results.creators) ? raw.results.creators : [],
						proposals: Array.isArray(raw.results.proposals) ? raw.results.proposals : [],
					};
				} else if ('keys' in raw || 'creators' in raw || 'proposals' in raw) {
					result = {
						keys: Array.isArray((raw as GlobalSearchResults).keys) ? (raw as GlobalSearchResults).keys : [],
						creators: Array.isArray((raw as GlobalSearchResults).creators) ? (raw as GlobalSearchResults).creators : [],
						proposals: Array.isArray((raw as GlobalSearchResults).proposals) ? (raw as GlobalSearchResults).proposals : [],
					};
				}
			}

			cacheManager.set(cacheKey, result, SEARCH_CACHE_TTL);
			return result;
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const searchService = new SearchService();
