import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api.service';

const mocks = vi.hoisted(() => ({
	getRoyaltyEarnings: vi.fn(),
	getTipsForCreator: vi.fn(),
	getSubscriptionsForCreator: vi.fn(),
	getSpotlightAuction: vi.fn(),
	submitCreatorContractCall: vi.fn(),
}));

vi.mock('../royalty.service', () => ({
	royaltyService: {
		getRoyaltyEarnings: mocks.getRoyaltyEarnings,
	},
}));

vi.mock('../tip.service', () => ({
	tipService: {
		getTipsForCreator: mocks.getTipsForCreator,
	},
}));

vi.mock('../keySubscriptionContract.service', () => ({
	keySubscriptionContractService: {
		getSubscriptionsForCreator: mocks.getSubscriptionsForCreator,
	},
}));

vi.mock('../spotlightAuction.service', () => ({
	spotlightAuctionService: {
		getSpotlightAuction: mocks.getSpotlightAuction,
	},
}));

vi.mock('@/hooks/useCreatorContractActions', () => ({
	submitCreatorContractCall: mocks.submitCreatorContractCall,
}));

import { cacheManager } from '@/utils/cache.utils';
import {
	creatorEarningsService,
	fetchCreatorEarnings,
	submitEarningsClaim,
} from '../creatorEarnings.service';

const CREATOR_ID = 'creator-key-1';
const WALLET = 'GCREATORWALLET00000000000000000000000000000000000000000001';

const royaltySummary = {
	totalEarnedXlm: 300,
	pendingXlm: 120,
	claimedXlm: 180,
	transfers: [
		{
			id: 'transfer-2',
			transferredAt: '2026-11-20T12:00:00.000Z',
			transferAmountXlm: 400,
			royaltyEarnedXlm: 50,
			transactionHash: 'royalty-tx-2',
		},
		{
			id: 'transfer-1',
			transferredAt: '2026-11-10T12:00:00.000Z',
			transferAmountXlm: 200,
			royaltyEarnedXlm: 250,
			transactionHash: 'royalty-tx-1',
		},
	],
	claims: [],
};

function subscription(overrides: Record<string, unknown> = {}) {
	return {
		id: 'subscription-1',
		creatorId: CREATOR_ID,
		investorAddress: 'GINVESTOR',
		amountXlm: 10,
		interval: 'monthly',
		intervalSeconds: 2_592_000,
		nextExecutionAt: '2026-12-01T00:00:00.000Z',
		totalInvestedXlm: 40,
		status: 'active',
		createdAt: '2026-10-01T00:00:00.000Z',
		updatedAt: '2026-11-01T00:00:00.000Z',
		...overrides,
	};
}

describe('creatorEarningsService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		cacheManager.invalidateAll();
		creatorEarningsService.clearClaimOverrides();
		mocks.getRoyaltyEarnings.mockResolvedValue(royaltySummary);
		mocks.getTipsForCreator.mockResolvedValue([
			{
				id: 'tip-1',
				creatorId: CREATOR_ID,
				tipper: 'GFAN',
				amount: 102,
				netAmount: 100,
				fee: 2,
				timestamp: Date.parse('2026-11-21T09:00:00.000Z'),
				txHash: 'tip-tx-1',
			},
		]);
		mocks.getSubscriptionsForCreator.mockResolvedValue([subscription()]);
		mocks.getSpotlightAuction.mockResolvedValue({
			slots: [],
			currentWinnerWallet: 'Gwinner',
			highestBid: 25,
			minIncrement: 1,
			endsAt: '2026-11-24T00:00:00.000Z',
		});
		mocks.submitCreatorContractCall.mockResolvedValue({ success: true });
	});

	it('builds balances from the real royalty, tip, subscription, and spotlight sources', async () => {
		const summary = await creatorEarningsService.getCreatorEarnings(
			CREATOR_ID,
			WALLET
		);

		expect(mocks.getRoyaltyEarnings).toHaveBeenCalledWith(CREATOR_ID, WALLET);
		expect(mocks.getTipsForCreator).toHaveBeenCalledWith(CREATOR_ID);
		expect(mocks.getSubscriptionsForCreator).toHaveBeenCalledWith(CREATOR_ID);
		expect(mocks.getSpotlightAuction).toHaveBeenCalledWith(CREATOR_ID);

		expect(summary.streams.royalties).toMatchObject({
			totalEarnedXlm: 300,
			unclaimedXlm: 120,
			claimedXlm: 180,
		});
		expect(summary.streams.tips).toMatchObject({
			totalEarnedXlm: 100,
			unclaimedXlm: 100,
		});
		expect(summary.streams.subscriptions).toMatchObject({
			totalEarnedXlm: 40,
			unclaimedXlm: 40,
		});
		expect(summary.streams.spotlight).toMatchObject({
			totalEarnedXlm: 25,
			unclaimedXlm: 25,
		});
		expect(summary.totalUnclaimedXlm).toBe(285);
		expect(summary.records.map(record => record.stream)).toEqual(
			expect.arrayContaining([
				'royalties',
				'tips',
				'subscriptions',
				'spotlight',
			])
		);
	});

	it('returns zero balances when every source is empty instead of generated records', async () => {
		mocks.getRoyaltyEarnings.mockResolvedValue({
			totalEarnedXlm: 0,
			pendingXlm: 0,
			claimedXlm: 0,
			transfers: [],
			claims: [],
		});
		mocks.getTipsForCreator.mockResolvedValue([]);
		mocks.getSubscriptionsForCreator.mockResolvedValue([]);
		mocks.getSpotlightAuction.mockResolvedValue({
			slots: [],
			currentWinnerWallet: null,
			highestBid: null,
			minIncrement: null,
			endsAt: null,
		});

		const summary = await creatorEarningsService.getCreatorEarnings(
			CREATOR_ID,
			WALLET
		);

		expect(summary.records).toEqual([]);
		expect(summary.totalUnclaimedXlm).toBe(0);
		expect(summary.totalEarnedXlm).toBe(0);
	});

	it('treats missing optional streams as empty', async () => {
		mocks.getRoyaltyEarnings.mockRejectedValue(
			new ApiError('No royalties', 404)
		);
		mocks.getSpotlightAuction.mockRejectedValue(
			new ApiError('No round', 404)
		);

		const summary = await creatorEarningsService.getCreatorEarnings(
			CREATOR_ID,
			WALLET
		);

		expect(summary.streams.royalties.unclaimedXlm).toBe(0);
		expect(summary.streams.spotlight.unclaimedXlm).toBe(0);
		expect(summary.streams.tips.unclaimedXlm).toBe(100);
	});

	it('fails rather than reporting partial balances when a source errors', async () => {
		mocks.getTipsForCreator.mockRejectedValue(
			new ApiError('Backend down', 500)
		);

		await expect(
			creatorEarningsService.getCreatorEarnings(CREATOR_ID, WALLET)
		).rejects.toBeInstanceOf(ApiError);
	});

	it('submits the stream-specific contract call and reduces that balance', async () => {
		const before = await fetchCreatorEarnings(CREATOR_ID, WALLET);
		expect(before.totalUnclaimedXlm).toBe(285);

		const result = await submitEarningsClaim(
			CREATOR_ID,
			'royalties',
			120,
			WALLET
		);

		expect(result.success).toBe(true);
		expect(mocks.submitCreatorContractCall).toHaveBeenCalledWith(
			'claim_royalties',
			{
				creatorId: CREATOR_ID,
				stream: 'royalties',
				amountXlm: 120,
				wallet: WALLET,
			}
		);

		const after = await fetchCreatorEarnings(CREATOR_ID, WALLET);
		expect(after.streams.royalties.unclaimedXlm).toBe(0);
		expect(after.streams.royalties.claimedXlm).toBe(300);
		expect(after.totalUnclaimedXlm).toBe(165);
		expect(
			after.records.find(record => record.stream === 'royalties')?.status
		).toBe('claimed');
	});

	it('routes each stream to its own claim function', async () => {
		await submitEarningsClaim(CREATOR_ID, 'tips', 100, WALLET);
		await submitEarningsClaim(CREATOR_ID, 'subscriptions', 40, WALLET);
		await submitEarningsClaim(CREATOR_ID, 'spotlight', 25, WALLET);

		const functions = mocks.submitCreatorContractCall.mock.calls.map(
			call => call[0]
		);
		expect(functions).toEqual([
			'claim_tips',
			'claim_subscription_fees',
			'claim_spotlight_earnings',
		]);
	});
});
