import { describe, expect, it, vi } from 'vitest';
import { SwapService, swapService } from '../swap.service';

describe('SwapService', () => {
	it('passes the computed max_spent bound derived from selected tolerance to buy contract invocation', async () => {
		const mockBuyKeys = vi.fn().mockResolvedValue({ hash: '0xabc123' });
		const service = new SwapService({
			buy_keys: mockBuyKeys,
		});

		// Buy 10 keys with expected total cost of 1000 and 1% tolerance (100 bps)
		// max_spent = 1000 * 1.01 = 1010
		const result = await service.buy({
			creatorId: 'creator-1',
			amount: 10,
			quote: {
				side: 'buy',
				amount: 10,
				expectedCost: 1000,
			},
			slippageTolerancePercent: 1,
		});

		expect(result.success).toBe(true);
		expect(result.bound).toBe(1010);
		expect(result.txHash).toBe('0xabc123');

		// Assert contract call received the bound
		expect(mockBuyKeys).toHaveBeenCalledWith(
			expect.objectContaining({
				creator_id: 'creator-1',
				amount: 10,
				max_spent: 1010,
			})
		);
	});

	it('passes the computed min_received bound derived from selected tolerance to sell contract invocation', async () => {
		const mockSellKeys = vi.fn().mockResolvedValue({ hash: '0xdef456' });
		const service = new SwapService({
			sell_keys: mockSellKeys,
		});

		// Sell 5 keys with expected proceeds of 500 and 3% tolerance (300 bps)
		// min_received = 500 * (1 - 0.03) = 485
		const result = await service.sell({
			creatorId: 'creator-2',
			amount: 5,
			quote: {
				side: 'sell',
				amount: 5,
				expectedProceeds: 500,
			},
			slippageTolerancePercent: 3,
		});

		expect(result.success).toBe(true);
		expect(result.bound).toBe(485);
		expect(result.txHash).toBe('0xdef456');

		// Assert contract call received the bound
		expect(mockSellKeys).toHaveBeenCalledWith(
			expect.objectContaining({
				creator_id: 'creator-2',
				amount: 5,
				min_received: 485,
			})
		);
	});

	it('supports positional arguments and derives the bound', async () => {
		const mockBuy = vi.fn().mockResolvedValue({ hash: '0x789' });
		const service = new SwapService({ buy: mockBuy });

		await service.buy('creator-3', 2, 202);

		expect(mockBuy).toHaveBeenCalledWith(
			expect.objectContaining({
				creator_id: 'creator-3',
				amount: 2,
				max_spent: 202,
			})
		);
	});

	it('default swapService instance works properly', async () => {
		const result = await swapService.buy({
			creatorId: 'creator-4',
			amount: 1,
			expectedCost: 100,
			slippageTolerancePercent: 0.5,
		});

		expect(result.success).toBe(true);
		expect(result.bound).toBe(100.5);
	});
});
