import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	analyticsService,
	normalizeKeyLeaderboardEntry,
} from '../analytics.service';
import { keyLeaderboardService } from '../keyLeaderboard.service';

describe('Key Discovery Leaderboard Service (#1206)', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('normalizes raw key leaderboard entry correctly', () => {
		const raw = {
			rank: 1,
			id: 'key-123',
			name: 'Elite Key',
			symbol: 'ELT',
			thumbnail: 'https://example.com/avatar.png',
			creator: {
				address: 'GCREATOR1234567890',
				name: 'Alice',
			},
			metricValue: 50000,
			change24h: 12.5,
			price: 15.2,
		};

		const normalized = normalizeKeyLeaderboardEntry(raw, 1, 'volume');
		expect(normalized.id).toBe('key-123');
		expect(normalized.name).toBe('Elite Key');
		expect(normalized.symbol).toBe('ELT');
		expect(normalized.creator.address).toBe('GCREATOR1234567890');
		expect(normalized.creator.name).toBe('Alice');
		expect(normalized.metricValue).toBe(50000);
		expect(normalized.change24h).toBe(12.5);
		expect(normalized.price).toBe(15.2);
	});

	it('normalizes alternative field names (e.g. title, volume24h, holderCount, creatorAddress)', () => {
		const raw = {
			keyId: 'alt-id',
			title: 'Alt Key',
			creatorAddress: 'GCALTADDRESS',
			creatorName: 'Bob',
			volume24h: 34000,
			priceChange24h: -5.4,
		};

		const normalized = normalizeKeyLeaderboardEntry(raw, 2, 'volume');
		expect(normalized.id).toBe('alt-id');
		expect(normalized.name).toBe('Alt Key');
		expect(normalized.creator.address).toBe('GCALTADDRESS');
		expect(normalized.creator.name).toBe('Bob');
		expect(normalized.metricValue).toBe(34000);
		expect(normalized.change24h).toBe(-5.4);
	});

	it('fetches leaderboard data via GET /analytics/keys/leaderboard?metric=X', async () => {
		const mockData = [
			{
				rank: 1,
				id: 'key-1',
				name: 'Test Key 1',
				symbol: 'TK1',
				creator: { address: 'G111', name: 'Creator 1' },
				metricValue: 100000,
				change24h: 10.2,
				price: 5.0,
			},
		];

		const apiService = analyticsService as unknown as {
			api: { get: ReturnType<typeof vi.fn> };
		};
		const getSpy = vi.spyOn(apiService.api, 'get').mockResolvedValueOnce({
			data: {
				success: true,
				data: mockData,
				message: 'OK',
			},
		});

		const result = await analyticsService.getKeyDiscoveryLeaderboard('volume');
		expect(getSpy).toHaveBeenCalledWith('/analytics/keys/leaderboard', {
			params: { metric: 'volume' },
		});
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe('Test Key 1');
	});

	it('delegates through keyLeaderboardService', async () => {
		const spy = vi
			.spyOn(analyticsService, 'getKeyDiscoveryLeaderboard')
			.mockResolvedValueOnce([
				{
					rank: 1,
					id: 'key-1',
					name: 'Key',
					creator: { address: 'G1' },
					metricValue: 100,
					change24h: 5,
				},
			]);

		const res = await keyLeaderboardService.getKeyDiscoveryLeaderboard('holders');
		expect(spy).toHaveBeenCalledWith('holders');
		expect(res[0].id).toBe('key-1');
	});

	it('returns 50 fallback mock keys when the API request fails', async () => {
		const apiService = analyticsService as unknown as {
			api: { get: ReturnType<typeof vi.fn> };
		};
		vi.spyOn(apiService.api, 'get').mockRejectedValueOnce(
			new Error('Network error')
		);

		const result = await analyticsService.getKeyDiscoveryLeaderboard('reputation');
		expect(result).toHaveLength(50);
		expect(result[0].rank).toBe(1);
		expect(result[49].rank).toBe(50);
		expect(result[0].metricValue).toBeGreaterThan(result[49].metricValue);
	});
});
