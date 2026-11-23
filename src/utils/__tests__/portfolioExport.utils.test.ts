import { describe, expect, it } from 'vitest';
import {
	generateHoldingsSnapshotCsv,
	generateDistributionsCsv,
	generateTradeHistoryCsv,
	buildExportFilename,
	HOLDINGS_SNAPSHOT_CSV_HEADERS,
	DISTRIBUTIONS_CSV_HEADERS,
	TRADE_HISTORY_CSV_HEADERS,
} from '@/utils/portfolioExport.utils';
import type { HeldKeyPosition } from '@/utils/portfolioValue.utils';
import type { RevenueShareDistribution } from '@/types/revenueShare';
import type { ProtocolRevenueDistribution } from '@/services/stakerRevenue.service';
import type { RevenueDistributionRecord } from '@/types/creatorRevenue';
import type { Trade } from '@/services/tradeHistory.service';

describe('Portfolio Export Utilities (#1256)', () => {
	describe('generateHoldingsSnapshotCsv', () => {
		it('generates CSV with correct headers', () => {
			const csv = generateHoldingsSnapshotCsv([]);
			expect(csv).toBe(HOLDINGS_SNAPSHOT_CSV_HEADERS.join(','));
		});

		it('formats holdings data correctly', () => {
			const holdings: HeldKeyPosition[] = [
				{
					creatorId: 'key1',
					keyName: 'Test Key',
					quantity: 10,
					priceStroops: 1_500_000, // 0.15 XLM
					averagePurchasePriceStroops: 1_000_000, // 0.10 XLM
					unclaimedDividend: 0.5,
				} as HeldKeyPosition,
			];

			const csv = generateHoldingsSnapshotCsv(holdings, { key1: 'Test Key' });
			const lines = csv.split('\r\n');

			expect(lines[0]).toBe(HOLDINGS_SNAPSHOT_CSV_HEADERS.join(','));
			expect(lines[1]).toContain('key1');
			expect(lines[1]).toContain('Test Key');
			expect(lines[1]).toContain('10');
			expect(lines[1]).toContain('0.1500000'); // current price
			expect(lines[1]).toContain('1.5000000'); // current value = 10 * 0.15
			expect(lines[1]).toContain('0.1000000'); // avg buy price
			expect(lines[1]).toContain('1.0000000'); // cost basis = 10 * 0.10
			expect(lines[1]).toContain('0.5000000'); // unrealised PnL = 1.5 - 1.0
			expect(lines[1]).toContain('50.00'); // PnL % = 50%
			expect(lines[1]).toContain('0.5000000'); // unclaimed dividend
		});

		it('handles missing price data gracefully', () => {
			const holdings: HeldKeyPosition[] = [
				{
					creatorId: 'key1',
					keyName: 'Test Key',
					quantity: 10,
					priceStroops: 0,
					averagePurchasePriceStroops: null,
					unclaimedDividend: 0,
				} as HeldKeyPosition,
			];

			const csv = generateHoldingsSnapshotCsv(holdings);
			const lines = csv.split('\r\n');

			expect(lines[1]).toContain('0.0000000'); // current price
			expect(lines[1]).toContain('0.0000000'); // current value
		});
	});

	describe('generateDistributionsCsv', () => {
		it('generates CSV with correct headers', () => {
			const csv = generateDistributionsCsv([]);
			expect(csv).toBe(DISTRIBUTIONS_CSV_HEADERS.join(','));
		});

		it('formats revenue share distributions correctly', () => {
			const dists: RevenueShareDistribution[] = [
				{
					id: 'dist1',
					creatorId: 'key1',
					amount: 100,
					timestamp: Date.now(),
					holderCount: 50,
					userShare: 2,
					claimed: true,
					receivedAmount: 2,
					claimedAt: Date.now(),
				},
			];

			const unified = dists.map(d => ({ type: 'revenue_share' as const, record: d }));
			const csv = generateDistributionsCsv(unified);
			const lines = csv.split('\r\n');

			expect(lines[0]).toBe(DISTRIBUTIONS_CSV_HEADERS.join(','));
			expect(lines[1]).toContain('Revenue Share (Holder Claim)');
			expect(lines[1]).toContain('key1');
			expect(lines[1]).toContain('100'); // total amount
			expect(lines[1]).toContain('50'); // holder count
			expect(lines[1]).toContain('2'); // user share
			expect(lines[1]).toContain('Yes'); // claimed
			expect(lines[1]).toContain('2'); // received amount
		});

		it('formats protocol revenue distributions correctly', () => {
			const dists: ProtocolRevenueDistribution[] = [
				{
					id: 'proto1',
					distributionDate: Date.now(),
					totalDistributed: 1000,
					stakerCount: 200,
					amountReceived: 5,
					claimed: true,
					transactionHash: 'tx123',
				},
			];

			const unified = dists.map(d => ({ type: 'protocol_revenue' as const, record: d }));
			const csv = generateDistributionsCsv(unified);
			const lines = csv.split('\r\n');

			expect(lines[1]).toContain('Protocol Revenue Distribution');
			expect(lines[1]).toContain('1000');
			expect(lines[1]).toContain('200');
			expect(lines[1]).toContain('5');
			expect(lines[1]).toContain('Yes');
			expect(lines[1]).toContain('tx123');
		});

		it('formats creator revenue distributions correctly', () => {
			const dists: RevenueDistributionRecord[] = [
				{
					id: 'creator1',
					creatorId: 'key1',
					amount: 500,
					timestamp: Date.now(),
					holderCount: 25,
					wallet: 'wallet1',
					status: 'confirmed',
				},
			];

			const unified = dists.map(d => ({
				type: 'creator_revenue' as const,
				record: d,
				userShare: 20,
				claimed: true,
				receivedAmount: 20,
				claimedAt: Date.now(),
				txHash: 'tx456',
			}));
			const csv = generateDistributionsCsv(unified);
			const lines = csv.split('\r\n');

			expect(lines[1]).toContain('Creator Revenue Distribution');
			expect(lines[1]).toContain('500');
			expect(lines[1]).toContain('25');
			expect(lines[1]).toContain('20');
			expect(lines[1]).toContain('Yes');
			expect(lines[1]).toContain('tx456');
		});
	});

	describe('generateTradeHistoryCsv', () => {
		it('generates CSV with correct headers', () => {
			const csv = generateTradeHistoryCsv([]);
			expect(csv).toBe(TRADE_HISTORY_CSV_HEADERS.join(','));
		});

		it('formats trades correctly', () => {
			const trades: Trade[] = [
				{
					id: 't1',
					keyName: 'Test Key',
					tradeType: 'Buy',
					quantity: 5,
					pricePerKey: 0.2,
					timestamp: Date.now(),
					transactionHash: 'tx1',
					feeXlm: 0.01,
				},
			];

			const csv = generateTradeHistoryCsv(trades);
			const lines = csv.split('\r\n');

			expect(lines[0]).toBe(TRADE_HISTORY_CSV_HEADERS.join(','));
			expect(lines[1]).toContain('Test Key');
			expect(lines[1]).toContain('Buy');
			expect(lines[1]).toContain('5');
			expect(lines[1]).toContain('0.2');
			expect(lines[1]).toContain('1.01'); // total = 5 * 0.2 + 0.01
			expect(lines[1]).toContain('0.01'); // fee
		});
	});

	describe('buildExportFilename', () => {
it('builds filename with wallet, type, date range, and date', () => {
		const wallet = 'GDEMOWALLET0000000000000000000000000000000000000000000000001';
		const filename = buildExportFilename(wallet, 'trade-history', {
			preset: '30d',
			from: Date.parse('2026-01-01'),
			to: Date.parse('2026-01-31'),
		});

		expect(filename).toMatch(/^trades-GDEM[\u2026…]0001-30d-2026-\d{2}-\d{2}\.csv$/);
	});

		it('handles all-time preset', () => {
			const wallet = 'SHORT';
			const filename = buildExportFilename(wallet, 'holdings-snapshot', {
				preset: 'all',
			});

			expect(filename).toMatch(/^holdings-snapshot-SHORT-all-time-2026-\d{2}-\d{2}\.csv$/);
		});

		it('handles custom range', () => {
			const wallet = 'WALLET123';
			const filename = buildExportFilename(wallet, 'distributions', {
				preset: 'custom',
				from: Date.parse('2026-01-01'),
				to: Date.parse('2026-06-30'),
			});

			expect(filename).toMatch(/^distributions-WALLET123-2026-01-01-to-2026-06-30-2026-\d{2}-\d{2}\.csv$/);
		});
	});
});