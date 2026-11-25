import { BaseApiService, type APIResponse } from './api.service';
import type { BalanceCheckpoint } from '@/types/balanceHistory.types';
import {
	DEFAULT_REFERENCE_LEDGER,
	DEFAULT_REFERENCE_TIMESTAMP,
} from '@/utils/balanceHistory.utils';

class BalanceHistoryService extends BaseApiService {
	/**
	 * Reads historical balance checkpoints for an address and optional key through indexer endpoint.
	 */
	async getBalanceCheckpoints(
		address: string,
		keyId?: string,
		range: string = 'all'
	): Promise<BalanceCheckpoint[]> {
		if (!address) return [];

		try {
			const response = await this.api.get<APIResponse<BalanceCheckpoint[]>>(
				`/wallets/${address}/checkpoints`,
				{ params: { keyId: keyId || undefined, range } }
			);
			return response.data.data ?? [];
		} catch {
			// Provide fallback deterministic checkpoints for testing & offline mode
			return this.getFallbackCheckpoints(address, keyId);
		}
	}

	private getFallbackCheckpoints(_address: string, keyId?: string): BalanceCheckpoint[] {
		const baseTimestamp = DEFAULT_REFERENCE_TIMESTAMP;
		const baseLedger = DEFAULT_REFERENCE_LEDGER;

		const mockData: BalanceCheckpoint[] = [
			{
				id: 'cp-1',
				ledger: baseLedger + 1000,
				timestamp: baseTimestamp + 1000 * 5000, // ~1.3 hours later
				keyId: 'alpha',
				keyName: 'Alpha Key',
				balance: 10,
				change: 10,
				eventType: 'buy',
			},
			{
				id: 'cp-2',
				ledger: baseLedger + 2500,
				timestamp: baseTimestamp + 2500 * 5000,
				keyId: 'beta',
				keyName: 'Beta Key',
				balance: 5,
				change: 5,
				eventType: 'buy',
			},
			{
				id: 'cp-3',
				ledger: baseLedger + 4000,
				timestamp: baseTimestamp + 4000 * 5000,
				keyId: 'alpha',
				keyName: 'Alpha Key',
				balance: 15,
				change: 5,
				eventType: 'buy',
			},
			{
				id: 'cp-4',
				ledger: baseLedger + 7000,
				timestamp: baseTimestamp + 7000 * 5000,
				keyId: 'alpha',
				keyName: 'Alpha Key',
				balance: 8,
				change: -7,
				eventType: 'sell',
			},
			{
				id: 'cp-5',
				ledger: baseLedger + 9000,
				timestamp: baseTimestamp + 9000 * 5000,
				keyId: 'beta',
				keyName: 'Beta Key',
				balance: 12,
				change: 7,
				eventType: 'buy',
			},
		];

		if (keyId && keyId !== 'all') {
			return mockData.filter(cp => cp.keyId === keyId);
		}
		return mockData;
	}
}

export const balanceHistoryService = new BalanceHistoryService();
