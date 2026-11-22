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
	airdropClaimsService,
	fetchAirdropClaims,
} from '../airdropClaims.service';

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

const mockAirdrops = [
	{
		id: 'airdrop-1',
		keyId: 'creator-1',
		keyName: 'Alpha Key',
		snapshotDate: '2026-01-01T00:00:00.000Z',
		totalDistributed: 1000,
		userAllocation: 25,
		claimed: false,
		receivedAmount: null,
		claimedAt: null,
	},
	{
		id: 'airdrop-2',
		keyId: 'creator-1',
		keyName: 'Alpha Key',
		snapshotDate: '2026-02-01T00:00:00.000Z',
		totalDistributed: 500,
		userAllocation: 10,
		claimed: true,
		receivedAmount: 10,
		claimedAt: '2026-02-05T12:00:00.000Z',
		claimTxHash: 'tx-abc',
	},
];

describe('airdropClaimsService', () => {
	beforeEach(() => {
		mockGet.mockReset();
		cacheManager.invalidateAll();
	});

	it('fetches airdrop claims from GET /users/:wallet/airdrop-claims', async () => {
		const mockResponse = { airdrops: mockAirdrops };

		mockGet.mockResolvedValueOnce(fakeApiResponse(mockResponse));

		const result = await airdropClaimsService.getAirdropClaims({
			wallet: WALLET,
		});

		expect(mockGet).toHaveBeenCalledWith(`/users/${WALLET}/airdrop-claims`);
		expect(result).toEqual(mockResponse);
	});

	it('fetches claims using the convenience wrapper fetchAirdropClaims', async () => {
		const mockResponse = { airdrops: [] };

		mockGet.mockResolvedValueOnce(fakeApiResponse(mockResponse));

		const result = await fetchAirdropClaims(WALLET);

		expect(mockGet).toHaveBeenCalledWith(`/users/${WALLET}/airdrop-claims`);
		expect(result).toEqual(mockResponse);
	});

	it('serves a cached response within the TTL without refetching', async () => {
		const mockResponse = { airdrops: mockAirdrops };

		mockGet.mockResolvedValueOnce(fakeApiResponse(mockResponse));

		await fetchAirdropClaims(WALLET);
		const second = await fetchAirdropClaims(WALLET);

		expect(mockGet).toHaveBeenCalledTimes(1);
		expect(second).toEqual(mockResponse);
	});

	it('throws ApiError on HTTP failure', async () => {
		mockGet.mockRejectedValueOnce(fakeApiError(500, 'Server error'));

		const err = await airdropClaimsService
			.getAirdropClaims({ wallet: WALLET })
			.catch((e: unknown) => e);

		expect(err).toBeInstanceOf(ApiError);
		expect((err as ApiError).status).toBe(500);
	});
});
