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

import { walletService, fetchWalletHoldings } from '../wallet.service';

const WALLET = 'GDEMOWALLET0000000000000000000000000000000000000000000000001';

const holdings = [
	{
		creatorId: 'creator-1',
		quantity: 4,
		priceStroops: 2_500_000,
		price: null,
	},
];

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

describe('walletService (#921)', () => {
	beforeEach(() => {
		mockGet.mockReset();
	});

	it('fetches holdings from GET /wallets/:address/holdings', async () => {
		mockGet.mockResolvedValueOnce(fakeApiResponse(holdings));

		const result = await walletService.getHoldings(WALLET);

		expect(mockGet).toHaveBeenCalledWith(`/wallets/${WALLET}/holdings`);
		expect(result).toEqual(holdings);
	});

	it('normalizes an envelope response containing a holdings array', async () => {
		mockGet.mockResolvedValueOnce(fakeApiResponse({ holdings }));

		const result = await walletService.getHoldings(WALLET);

		expect(result).toEqual(holdings);
	});

	it('fetches holdings using the convenience wrapper', async () => {
		mockGet.mockResolvedValueOnce(fakeApiResponse(holdings));

		const result = await fetchWalletHoldings(WALLET);

		expect(mockGet).toHaveBeenCalledWith(`/wallets/${WALLET}/holdings`);
		expect(result).toEqual(holdings);
	});

	it('throws ApiError on HTTP failure', async () => {
		mockGet.mockRejectedValueOnce(fakeApiError(500, 'Server error'));

		const err = await walletService.getHoldings(WALLET).catch(e => e);

		expect(err).toBeInstanceOf(ApiError);
		expect((err as ApiError).status).toBe(500);
	});
});
