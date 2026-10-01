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
	stakingPositionsService,
	fetchStakingPositions,
} from '../stakingPositions.service';

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

describe('stakingPositionsService (#921)', () => {
	beforeEach(() => {
		mockGet.mockReset();
		cacheManager.invalidateAll();
	});

	it('fetches staking positions from GET /users/:wallet/staking-positions', async () => {
		const mockResponse = {
			positions: [
				{
					id: 'pos-1',
					keyId: 'creator-1',
					keyName: 'Alpha Key',
					stakedQuantity: 120,
					unlockLedger: 1_900_000_000,
					claimableReward: 5.5,
					priceStroops: 2_500_000,
					price: null,
				},
			],
		};

		mockGet.mockResolvedValueOnce(fakeApiResponse(mockResponse));

		const result = await stakingPositionsService.getStakingPositions({
			wallet: WALLET,
		});

		expect(mockGet).toHaveBeenCalledWith(
			`/users/${WALLET}/staking-positions`
		);
		expect(result).toEqual(mockResponse);
	});

	it('fetches positions using the convenience wrapper fetchStakingPositions', async () => {
		const mockResponse = { positions: [] };

		mockGet.mockResolvedValueOnce(fakeApiResponse(mockResponse));

		const result = await fetchStakingPositions(WALLET);

		expect(mockGet).toHaveBeenCalledWith(
			`/users/${WALLET}/staking-positions`
		);
		expect(result).toEqual(mockResponse);
	});

	it('throws ApiError on HTTP failure', async () => {
		mockGet.mockRejectedValueOnce(fakeApiError(500, 'Server error'));

		const err = await stakingPositionsService
			.getStakingPositions({ wallet: WALLET })
			.catch((e: unknown) => e);

		expect(err).toBeInstanceOf(ApiError);
		expect((err as ApiError).status).toBe(500);
	});
});
