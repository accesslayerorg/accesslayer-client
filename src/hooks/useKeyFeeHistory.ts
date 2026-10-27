import { useQuery } from '@tanstack/react-query';
import { BaseApiService, type APIResponse } from '@/services/api.service';
import { cacheManager } from '@/utils/cache.utils';

export type FeeHistoryRange = '7d' | '30d' | 'all';

export interface FeeHistoryPoint {
	timestamp: string;
	feeBps: number;
	bracketLabel?: string;
}

export interface FeeHistoryResponse {
	points: FeeHistoryPoint[];
	currentFeeBps: number;
	currentBracketLabel?: string;
	bracketThresholds?: Array<{ feeBps: number; label: string; volumeXlm: number }>;
}

class KeyFeeHistoryService extends BaseApiService {
	async getFeeHistory(keyId: string, range: FeeHistoryRange): Promise<FeeHistoryResponse> {
		const cacheKey = `fee-history_${keyId}_${range}`;
		const cached = cacheManager.get<FeeHistoryResponse>(cacheKey);
		if (cached) return cached;

		try {
			const response = await this.api.get<APIResponse<FeeHistoryResponse>>(
				`/keys/${keyId}/fee/history`,
				{ params: { range } }
			);
			const data = response.data.data;
			cacheManager.set(cacheKey, data, 60_000);
			return data;
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

const keyFeeHistoryService = new KeyFeeHistoryService();

export function useKeyFeeHistory(keyId: string, range: FeeHistoryRange = '30d') {
	return useQuery({
		queryKey: ['keys', keyId, 'fee-history', range],
		queryFn: () => keyFeeHistoryService.getFeeHistory(keyId, range),
		enabled: Boolean(keyId),
		staleTime: 60_000,
	});
}
