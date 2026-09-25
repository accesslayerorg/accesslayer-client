import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ApiError } from '../api.service';

const { mockGet } = vi.hoisted(() => ({
	mockGet: vi.fn(),
}));

vi.mock('axios', () => ({
	default: {
		create: vi.fn(() => ({
			get: mockGet,
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
	stakerRevenueService,
	fetchProtocolRevenuePage,
} from '../stakerRevenue.service';

const WALLET = 'GDEMOWALLET0000000000000000000000000000000000000000000000001';

function fakeApiResponse<T>(data: T) {
	return {
		data: { success: true, data, message: 'ok' },
	};
}

function fakeApiError(status: number, message: string) {
	return {
		isAxiosError: true as const,
		response: { status, data: { success: false, message } },
		config: {},
		message,
	};
}

describe('stakerRevenueService', () => {
	beforeEach(() => {
		mockGet.mockReset();
		cacheManager.invalidateAll();
	});

	it('fetches protocol revenue distribution history with cursor pagination from GET /staker/:wallet/protocol-revenue', async () => {
		const mockResponse = {
			distributions: [
				{
					id: 'dist-1',
					distributionDate: '2026-09-20T12:00:00Z',
					totalDistributed: 5000,
					stakerCount: 100,
					amountReceived: 50,
				},
			],
			nextCursor: 'cursor-2',
		};

		mockGet.mockResolvedValueOnce(fakeApiResponse(mockResponse));

		const result = await stakerRevenueService.getProtocolRevenueHistory({
			wallet: WALLET,
			cursor: 'cursor-1',
			limit: 10,
		});

		expect(mockGet).toHaveBeenCalledWith(
			`/staker/${WALLET}/protocol-revenue`,
			{
				params: { cursor: 'cursor-1', limit: 10 },
			}
		);
		expect(result).toEqual(mockResponse);
	});

	it('fetches page using convenience wrapper fetchProtocolRevenuePage', async () => {
		const mockResponse = {
			distributions: [
				{
					id: 'dist-2',
					distributionDate: '2026-09-21T12:00:00Z',
					totalDistributed: 10000,
					stakerCount: 200,
					amountReceived: 50,
				},
			],
			nextCursor: null,
		};

		mockGet.mockResolvedValueOnce(fakeApiResponse(mockResponse));

		const result = await fetchProtocolRevenuePage(WALLET, null);

		expect(mockGet).toHaveBeenCalledWith(
			`/staker/${WALLET}/protocol-revenue`,
			{
				params: {},
			}
		);
		expect(result).toEqual(mockResponse);
	});

	it('throws ApiError on HTTP failure', async () => {
		mockGet.mockRejectedValueOnce(fakeApiError(500, 'Server error'));

		const err = await stakerRevenueService
			.getProtocolRevenueHistory({ wallet: WALLET })
			.catch((e: unknown) => e);

		expect(err).toBeInstanceOf(ApiError);
		expect((err as ApiError).status).toBe(500);
	});
});
