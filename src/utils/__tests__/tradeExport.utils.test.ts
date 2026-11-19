import { describe, expect, it } from 'vitest';
import {
	buildTradeHistoryCsvFilename,
	generateTradeHistoryCsv,
	TRADE_HISTORY_CSV_HEADERS,
} from '@/utils/tradeLedger.utils';
import type { Trade } from '@/services/tradeHistory.service';

const T = (iso: string) => Date.parse(iso);

function makeTrade(i: number, over: Partial<Trade> = {}): Trade {
	return {
		id: `t${i}`,
		keyName: `Key ${i}`,
		tradeType: i % 2 === 0 ? 'Buy' : 'Sell',
		quantity: 2,
		pricePerKey: 1.5,
		timestamp: T('2026-10-01T12:00:00.000Z') + i * 60_000,
		transactionHash: null,
		feeXlm: 0.1,
		...over,
	};
}

describe('trade history CSV export utils (#857)', () => {
	describe('buildTradeHistoryCsvFilename', () => {
		it('builds filename with truncated wallet and current date in YYYY-MM-DD format', () => {
			const wallet =
				'GDEMOWALLET0000000000000000000000000000000000000000000000001';
			const date = T('2026-10-22T10:00:00.000Z');
			const filename = buildTradeHistoryCsvFilename(wallet, date);

			expect(filename).toBe('trades-GDEM…0001-2026-10-22.csv');
			expect(filename).toMatch(/^trades-.+-\d{4}-\d{2}-\d{2}\.csv$/);
		});

		it('handles short wallet address without errors', () => {
			const filename = buildTradeHistoryCsvFilename(
				'SHORT',
				T('2026-10-22T10:00:00.000Z')
			);
			expect(filename).toBe('trades-SHORT-2026-10-22.csv');
		});
	});

	describe('generateTradeHistoryCsv', () => {
		it('generates CSV with exact headers: Date, Key Name, Type, Quantity, Price per Key, Total, Fee', () => {
			const csv = generateTradeHistoryCsv([]);
			expect(csv).toBe(
				'Date,Key Name,Type,Quantity,Price per Key,Total,Fee'
			);
			expect(TRADE_HISTORY_CSV_HEADERS).toEqual([
				'Date',
				'Key Name',
				'Type',
				'Quantity',
				'Price per Key',
				'Total',
				'Fee',
			]);
		});

		it('formats rows with correct columns, calculations, and RFC 4180 escaping', () => {
			const trades: Trade[] = [
				makeTrade(0, {
					keyName: 'Alpha Key',
					tradeType: 'Buy',
					quantity: 10,
					pricePerKey: 2.5,
					feeXlm: 0.25,
					timestamp: T('2026-10-15T14:30:00.000Z'),
				}),
				makeTrade(1, {
					keyName: 'Beta, "Pro" Key',
					tradeType: 'Sell',
					quantity: 4,
					pricePerKey: 5.0,
					feeXlm: 0.5,
					timestamp: T('2026-10-16T09:15:00.000Z'),
				}),
				makeTrade(2, {
					keyName: '=SUM(1,2)',
					tradeType: 'Buy',
					quantity: 1,
					pricePerKey: 10,
					feeXlm: undefined,
					timestamp: T('2026-10-17T11:00:00.000Z'),
				}),
			];

			const csv = generateTradeHistoryCsv(trades);
			const lines = csv.split('\r\n');

			expect(lines).toHaveLength(4); // 1 header + 3 rows
			expect(lines[0]).toBe(
				'Date,Key Name,Type,Quantity,Price per Key,Total,Fee'
			);
			// Buy: subtotal = 25, fee = 0.25, total = 25.25
			expect(lines[1]).toBe(
				'2026-10-15T14:30:00.000Z,Alpha Key,Buy,10,2.5,25.25,0.25'
			);
			// Sell: subtotal = 20, fee = 0.5, total = 19.5, quotes escaped
			expect(lines[2]).toBe(
				'2026-10-16T09:15:00.000Z,"Beta, ""Pro"" Key",Sell,4,5,19.5,0.5'
			);
			// Formula injection neutralized with prepended quote and wrapped in quotes due to comma
			expect(lines[3]).toContain('"\'=SUM(1,2)",Buy,1,10,10,0');
		});
	});
});
