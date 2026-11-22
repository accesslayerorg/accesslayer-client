import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiError } from '../api.service';

const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }));

vi.mock('axios', () => ({
	default: {
		create: vi.fn(() => ({
			get: mockGet,
			post: vi.fn(),
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
}));

const { submitCreatorContractCall } = vi.hoisted(() => ({
	submitCreatorContractCall: vi.fn(),
}));

vi.mock('@/hooks/useCreatorContractActions', () => ({
	submitCreatorContractCall,
}));

import {
	claimRevenueShare,
	fetchRevenueShareDistributions,
	normalizeRevenueShareDistribution,
	revenueShareService,
} from '../revenueShare.service';

const KEY_ID = 'key-1';
const WALLET = '0xAAA';

describe('revenueShareService (#1223)', () => {
	beforeEach(() => {
		mockGet.mockReset();
		submitCreatorContractCall.mockReset();
		submitCreatorContractCall.mockResolvedValue({ success: true });
	});

	it('requests the distributions for the key and wallet', async () => {
		mockGet.mockResolvedValueOnce({
			data: { success: true, data: { distributions: [] } },
		});

		await fetchRevenueShareDistributions(KEY_ID, WALLET);

		expect(mockGet).toHaveBeenCalledWith('/keys/key-1/revenue-distributions', {
			params: { wallet: WALLET },
		});
	});

	it('omits the wallet param when no wallet is connected', async () => {
		mockGet.mockResolvedValueOnce({
			data: { success: true, data: [] },
		});

		await fetchRevenueShareDistributions(KEY_ID);

		expect(mockGet).toHaveBeenCalledWith('/keys/key-1/revenue-distributions', {
			params: undefined,
		});
	});

	it('returns the holder share and claim state of each distribution', async () => {
		mockGet.mockResolvedValueOnce({
			data: {
				success: true,
				data: {
					distributions: [
						{
							id: 'dist-1',
							amount: 100,
							timestamp: '2026-10-01T10:00:00Z',
							holderCount: 4,
							userShare: 25,
							claimed: false,
						},
					],
				},
			},
		});

		const distributions = await revenueShareService.getDistributions(
			KEY_ID,
			WALLET
		);

		expect(distributions).toHaveLength(1);
		expect(distributions[0]).toEqual({
			id: 'dist-1',
			creatorId: KEY_ID,
			amount: 100,
			timestamp: Date.parse('2026-10-01T10:00:00Z'),
			holderCount: 4,
			userShare: 25,
			claimed: false,
			receivedAmount: null,
			claimedAt: null,
		});
	});

	it('reads a claimed distribution with its received amount and date', async () => {
		mockGet.mockResolvedValueOnce({
			data: {
				success: true,
				data: [
					{
						id: 'dist-2',
						amount: 50,
						timestamp: 1_700_000_000_000,
						holderCount: 2,
						userShare: 12.5,
						claimed: true,
						receivedAmount: 12.5,
						claimedAt: 1_700_000_100_000,
					},
				],
			},
		});

		const distributions = await revenueShareService.getDistributions(
			KEY_ID,
			WALLET
		);

		expect(distributions[0].claimed).toBe(true);
		expect(distributions[0].receivedAmount).toBe(12.5);
		expect(distributions[0].claimedAt).toBe(1_700_000_100_000);
	});

	it('handles server errors and wraps them in ApiError', async () => {
		mockGet.mockRejectedValueOnce({
			isAxiosError: true,
			response: { status: 500, data: { success: false, message: 'Server error' } },
			message: 'Server error',
		});

		await expect(
			revenueShareService.getDistributions(KEY_ID, WALLET)
		).rejects.toThrow(ApiError);
	});

	it('treats a missing endpoint as no distributions', async () => {
		mockGet.mockRejectedValueOnce({
			isAxiosError: true,
			response: { status: 404, data: { success: false, message: 'Not found' } },
			message: 'Not found',
		});

		await expect(
			revenueShareService.getDistributions(KEY_ID, WALLET)
		).resolves.toEqual([]);
	});
});

describe('claimRevenueShare (#1223)', () => {
	beforeEach(() => {
		submitCreatorContractCall.mockReset();
		submitCreatorContractCall.mockResolvedValue({ success: true });
	});

	it('submits the claim_revenue_share contract call', async () => {
		await claimRevenueShare(KEY_ID, 'dist-1', WALLET);

		expect(submitCreatorContractCall).toHaveBeenCalledWith(
			'claim_revenue_share',
			{
				creatorId: KEY_ID,
				distributionId: 'dist-1',
				wallet: WALLET,
			}
		);
	});
});

describe('normalizeRevenueShareDistribution (#1223)', () => {
	it('drops entries without an id', () => {
		expect(normalizeRevenueShareDistribution({ amount: 10 }, 'key-1')).toBeNull();
	});

	it('accepts snake_case aliases', () => {
		const distribution = normalizeRevenueShareDistribution(
			{
				distribution_id: 'dist-9',
				totalAmount: 20,
				holder_count: 3,
				user_share: 5,
				created_at: '2026-10-01T10:00:00Z',
			},
			'key-1'
		);

		expect(distribution?.id).toBe('dist-9');
		expect(distribution?.amount).toBe(20);
		expect(distribution?.holderCount).toBe(3);
		expect(distribution?.userShare).toBe(5);
		expect(distribution?.creatorId).toBe('key-1');
	});

	it('treats a claimed status as claimed', () => {
		const distribution = normalizeRevenueShareDistribution(
			{ id: 'dist-1', status: 'claimed' },
			'key-1'
		);

		expect(distribution?.claimed).toBe(true);
	});
});
