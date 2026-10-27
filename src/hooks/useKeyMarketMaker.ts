import { useQuery } from '@tanstack/react-query';
import { BaseApiService, type APIResponse } from '@/services/api.service';
import { cacheManager } from '@/utils/cache.utils';

const CACHE_TTL = 30_000;

export interface MarketMakerInfo {
	walletAddress: string;
	spreadBps: number;
	active: boolean;
}

class KeyMarketMakerService extends BaseApiService {
	async getMarketMaker(keyId: string): Promise<MarketMakerInfo | null> {
		const cacheKey = `market-maker_${keyId}`;
		const cached = cacheManager.get<MarketMakerInfo | null>(cacheKey);
		if (cached !== undefined) return cached;

		try {
			const response = await this.api.get<APIResponse<MarketMakerInfo | null>>(
				`/keys/${keyId}/market-maker`
			);
			const data = response.data.data ?? null;
			cacheManager.set(cacheKey, data, CACHE_TTL);
			return data;
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

const keyMarketMakerService = new KeyMarketMakerService();

export function useKeyMarketMaker(keyId: string) {
	return useQuery({
		queryKey: ['keys', keyId, 'market-maker'],
		queryFn: () => keyMarketMakerService.getMarketMaker(keyId),
		enabled: Boolean(keyId),
		staleTime: 20_000,
		refetchInterval: 30_000,
	});
}
