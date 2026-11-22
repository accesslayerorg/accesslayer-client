import { describe, expect, it } from 'vitest';
import type { Trade } from '@/services/tradeHistory.service';
import {
	calculateCostBasis,
	calculateRealizedGains,
	exportGainsCsv,
} from '@/utils/portfolio';

const trade = (overrides: Partial<Trade>): Trade => ({
	id: 'trade',
	keyName: 'Alpha',
	tradeType: 'Buy',
	quantity: 1,
	pricePerKey: 10,
	timestamp: 0,
	transactionHash: null,
	...overrides,
});

describe('portfolio cost basis and realized gains', () => {
	it('updates average cost across multiple buys', () => {
		const basis = calculateCostBasis([
			trade({ id: 'b2', quantity: 2, pricePerKey: 20, timestamp: 2 }),
			trade({ id: 'b1', quantity: 2, pricePerKey: 10, timestamp: 1 }),
		]);

		expect(basis.get('Alpha')).toEqual({
			quantity: 4,
			totalCost: 60,
			averageCost: 15,
		});
	});

	it('uses the running average for a partial sell', () => {
		const gains = calculateRealizedGains([
			trade({ id: 'b1', quantity: 2, pricePerKey: 10, timestamp: 1 }),
			trade({ id: 'b2', quantity: 2, pricePerKey: 20, timestamp: 2 }),
			trade({
				id: 's1',
				tradeType: 'Sell',
				quantity: 1,
				pricePerKey: 25,
				timestamp: 3,
			}),
		]);

		expect(gains[0]).toMatchObject({
			quantity: 1,
			proceeds: 25,
			costBasis: 15,
			gain: 10,
		});
	});

	it('exports the requested columns and escapes key names', () => {
		const csv = exportGainsCsv([
			{
				id: 's1',
				keyName: 'Alpha, Key',
				timestamp: Date.parse('2026-01-02T00:00:00.000Z'),
				quantity: 1,
				proceeds: 20,
				costBasis: 15,
				gain: 5,
			},
		]);

		expect(csv).toBe(
			'Date,Key,Quantity,Proceeds,Cost Basis,Gain\r\n2026-01-02T00:00:00.000Z,"Alpha, Key",1,20,15,5'
		);
	});
});
