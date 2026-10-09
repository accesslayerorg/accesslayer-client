import { describe, expect, it, vi, beforeEach } from 'vitest';

const { mockGet, mockPost } = vi.hoisted(() => ({
	mockGet: vi.fn(),
	mockPost: vi.fn(),
}));

vi.mock('axios', () => ({
	default: {
		create: vi.fn(() => ({
			get: mockGet,
			post: mockPost,
			interceptors: {
				request: { use: vi.fn() },
				response: { use: vi.fn() },
			},
		})),
		isAxiosError: (err: unknown): boolean =>
			err !== null &&
			typeof err === 'object' &&
			(err as Record<string, unknown>).isAxiosError === true,
	},
	isAxiosError: (err: unknown): boolean =>
		err !== null &&
		typeof err === 'object' &&
		(err as Record<string, unknown>).isAxiosError === true,
}));

import { cacheManager } from '@/utils/cache.utils';
import {
	creatorRevenueService,
	fetchCreatorRevenueSummary,
	fetchCreatorRevenueHistory,
	fetchCreatorWithdrawals,
	submitCreatorWithdrawal,
} from '../creatorRevenue.service';

const CREATOR_ID = 'creator-alice';

function fakeApiResponse<T>(data: T) {
	return {
		data: { success: true, data, message: 'ok' },
	};
}

describe('creatorRevenueService', () => {
	beforeEach(() => {
		mockGet.mockReset();
		mockPost.mockReset();
		cacheManager.invalidateAll();
	});

	it('fetches creator revenue summary from GET /creators/:id/revenue/summary', async () => {
		const mockSummary = {
			creatorId: CREATOR_ID,
			royaltiesEarned: 500,
			subscriptionFees: 200,
			dividendDeposits: 100,
			totalEarnings: 800,
			claimableProceeds: 300,
			totalWithdrawn: 500,
			lastUpdated: 1700000000000,
		};

		mockGet.mockResolvedValueOnce(fakeApiResponse(mockSummary));

		const result =
			await creatorRevenueService.getCreatorRevenueSummary(CREATOR_ID);

		expect(mockGet).toHaveBeenCalledWith(
			`/creators/${CREATOR_ID}/revenue/summary`
		);
		expect(result.royaltiesEarned).toBe(500);
		expect(result.totalEarnings).toBe(800);
		expect(result.claimableProceeds).toBe(300);
	});

	it('fetches revenue history for a specific interval from GET /creators/:id/revenue/history', async () => {
		const mockHistory = [
			{
				timestamp: '2026-09-28T12:00:00Z',
				royalties: 120,
				subscriptionFees: 45,
				dividendDeposits: 30,
				total: 195,
			},
		];

		mockGet.mockResolvedValueOnce(fakeApiResponse(mockHistory));

		const result = await creatorRevenueService.getCreatorRevenueHistory(
			CREATOR_ID,
			'7d'
		);

		expect(mockGet).toHaveBeenCalledWith(
			`/creators/${CREATOR_ID}/revenue/history`,
			{ params: { interval: '7d' } }
		);
		expect(result).toEqual(mockHistory);
	});

	it('falls back to mock points when history endpoint fails', async () => {
		mockGet.mockRejectedValueOnce(new Error('Network error'));

		const result = await creatorRevenueService.getCreatorRevenueHistory(
			CREATOR_ID,
			'24h'
		);

		expect(Array.isArray(result)).toBe(true);
		expect(result.length).toBeGreaterThan(0);
	});

	it('submits withdrawal claim transaction via POST /creators/:id/revenue/withdraw', async () => {
		mockPost.mockResolvedValueOnce(fakeApiResponse({ status: 'confirmed' }));

		const result = await creatorRevenueService.withdrawCreatorRevenue(
			CREATOR_ID,
			150,
			'GWALLET01'
		);

		expect(result.success).toBe(true);
		expect(result.amount).toBe(150);
		expect(result.record.creatorId).toBe(CREATOR_ID);
		expect(result.record.status).toBe('confirmed');
		expect(result.transactionHash).toHaveLength(64);
	});

	it('fetches withdrawals and combines with local storage records', async () => {
		const remoteRecord = {
			id: 'wd-remote-1',
			creatorId: CREATOR_ID,
			amount: 75,
			timestamp: 1700000100000,
			transactionHash: 'hash-remote',
			status: 'confirmed' as const,
		};

		mockGet.mockResolvedValueOnce(fakeApiResponse([remoteRecord]));

		const result =
			await creatorRevenueService.getCreatorWithdrawals(CREATOR_ID);
		expect(result.some(r => r.id === 'wd-remote-1')).toBe(true);
	});

	it('supports convenience wrappers', async () => {
		mockGet.mockResolvedValueOnce(
			fakeApiResponse({
				creatorId: CREATOR_ID,
				royaltiesEarned: 10,
				subscriptionFees: 5,
				dividendDeposits: 2,
				totalEarnings: 17,
				claimableProceeds: 17,
				totalWithdrawn: 0,
			})
		);

		const summary = await fetchCreatorRevenueSummary(CREATOR_ID);
		expect(summary.totalEarnings).toBe(17);

		mockGet.mockResolvedValueOnce(fakeApiResponse([]));
		const history = await fetchCreatorRevenueHistory(CREATOR_ID, '24h');
		expect(Array.isArray(history)).toBe(true);

		mockGet.mockResolvedValueOnce(fakeApiResponse([]));
		const withdrawals = await fetchCreatorWithdrawals(CREATOR_ID);
		expect(Array.isArray(withdrawals)).toBe(true);

		mockPost.mockResolvedValueOnce(fakeApiResponse({}));
		const claim = await submitCreatorWithdrawal(CREATOR_ID, 10);
		expect(claim.success).toBe(true);
	});
});
