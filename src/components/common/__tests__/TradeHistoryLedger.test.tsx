import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	render,
	screen,
	fireEvent,
	waitFor,
	within,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TradeHistoryLedger from '@/components/common/TradeHistoryLedger';
import {
	computeTradeAmounts,
	filterTrades,
	paginate,
	tradesToCsv,
} from '@/utils/tradeLedger.utils';
import type { Trade } from '@/services/tradeHistory.service';

const getTradeHistory = vi.fn();
vi.mock('@/services/tradeHistory.service', () => ({
	tradeHistoryService: {
		getTradeHistory: (...args: unknown[]) => getTradeHistory(...args),
	},
}));

const downloadCsv = vi.fn();
vi.mock('@/utils/transactionHistory.utils', () => ({
	downloadCsv: (...args: unknown[]) => downloadCsv(...args),
}));

const T = (iso: string) => Date.parse(iso);

function trade(i: number, over: Partial<Trade> = {}): Trade {
	return {
		id: `t${i}`,
		keyName: `Key ${i}`,
		tradeType: i % 2 === 0 ? 'Buy' : 'Sell',
		quantity: 2,
		pricePerKey: 1.5,
		timestamp: T('2026-10-01T12:00:00Z') + i * 60_000,
		transactionHash: null,
		feeXlm: 0.1,
		...over,
	};
}

function renderLedger() {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	render(
		<QueryClientProvider client={client}>
			<TradeHistoryLedger walletAddress="GWALLET" />
		</QueryClientProvider>
	);
}

function mockTrades(trades: Trade[], pageSize = 1000) {
	getTradeHistory.mockImplementation(
		async ({ cursor }: { cursor?: string | null }) => {
			const start = cursor ? Number(cursor) : 0;
			const slice = trades.slice(start, start + pageSize);
			const next =
				start + pageSize < trades.length ? String(start + pageSize) : null;
			return { trades: slice, nextCursor: next };
		}
	);
}

describe('tradeLedger utils (#1114)', () => {
	it('computes total as subtotal + fee for buys and − fee for sells', () => {
		expect(
			computeTradeAmounts(
				trade(0, {
					tradeType: 'Buy',
					quantity: 2,
					pricePerKey: 1.5,
					feeXlm: 0.1,
				})
			)
		).toEqual({ subtotal: 3, fee: 0.1, total: 3.1 });
		expect(
			computeTradeAmounts(
				trade(1, {
					tradeType: 'Sell',
					quantity: 2,
					pricePerKey: 1.5,
					feeXlm: 0.1,
				})
			)
		).toEqual({ subtotal: 3, fee: 0.1, total: 2.9 });
		expect(computeTradeAmounts(trade(2, { feeXlm: undefined })).fee).toBe(0);
	});

	it('filters by inclusive UTC date range and key name', () => {
		const trades = [
			trade(1, { keyName: 'Alpha', timestamp: T('2026-10-01T00:00:00Z') }),
			trade(2, { keyName: 'alpine', timestamp: T('2026-10-05T23:59:59Z') }),
			trade(3, { keyName: 'Beta', timestamp: T('2026-10-06T00:00:00Z') }),
		];
		const byDate = filterTrades(trades, {
			from: '2026-10-01',
			to: '2026-10-05',
			search: '',
		});
		expect(byDate.map(t => t.id).sort()).toEqual(['t1', 't2']);
		const byName = filterTrades(trades, { from: '', to: '', search: 'ALP' });
		expect(byName.map(t => t.id).sort()).toEqual(['t1', 't2']);
		const both = filterTrades(trades, {
			from: '2026-10-02',
			to: '',
			search: 'alp',
		});
		expect(both.map(t => t.id)).toEqual(['t2']);
	});

	it('paginates and clamps the page', () => {
		const items = Array.from({ length: 25 }, (_, i) => i);
		expect(paginate(items, 1)).toHaveLength(10);
		expect(paginate(items, 3)).toEqual([20, 21, 22, 23, 24]);
		expect(paginate(items, 99)).toEqual([20, 21, 22, 23, 24]);
	});

	it('writes a CSV with headers, all rows, and escaped fields', () => {
		const csv = tradesToCsv([
			trade(0, { keyName: 'Says "hi", ok' }),
			trade(1, { keyName: '=SUM(A1)' }),
		]);
		const lines = csv.split('\r\n');
		expect(lines[0]).toBe(
			'Date,Key,Direction,Amount,Price (XLM),Fee (XLM),Total (XLM)'
		);
		expect(lines).toHaveLength(3);
		expect(lines[1]).toContain('"Says ""hi"", ok",Buy,2,1.5,0.1,3.1');
		expect(lines[2]).toContain("'=SUM(A1),Sell,2,1.5,0.1,2.9");
	});
});

describe('TradeHistoryLedger (#1114)', () => {
	beforeEach(() => {
		getTradeHistory.mockReset();
		downloadCsv.mockReset();
	});

	it('shows the columns and values from the API', async () => {
		mockTrades([trade(0, { keyName: 'Alice Key', tradeType: 'Buy' })]);
		renderLedger();
		await screen.findByTestId('trade-ledger-table');

		const headers = screen
			.getAllByRole('columnheader')
			.map(h => h.textContent);
		expect(headers).toEqual([
			'Date',
			'Key',
			'Direction',
			'Amount',
			'Price',
			'Fee',
			'Total',
		]);
		const row = screen.getByTestId('trade-ledger-row');
		expect(within(row).getByText('Alice Key')).toBeInTheDocument();
		expect(within(row).getByText('Oct 1, 2026')).toBeInTheDocument();
		expect(within(row).getByText('2')).toBeInTheDocument();
		expect(within(row).getByText('1.50 XLM')).toBeInTheDocument();
		expect(within(row).getByText('0.10 XLM')).toBeInTheDocument();
		expect(within(row).getByText('3.10 XLM')).toBeInTheDocument();
	});

	it('colour-codes direction chips: green Buy, red Sell', async () => {
		mockTrades([
			trade(0, { tradeType: 'Buy' }),
			trade(1, { tradeType: 'Sell' }),
		]);
		renderLedger();
		await screen.findByTestId('trade-ledger-table');
		const chips = screen.getAllByTestId('direction-chip');
		const buy = chips.find(c => c.dataset.direction === 'Buy')!;
		const sell = chips.find(c => c.dataset.direction === 'Sell')!;
		expect(buy.className).toMatch(/emerald/);
		expect(sell.className).toMatch(/rose/);
	});

	it('follows the cursor to load every page of history', async () => {
		mockTrades(
			Array.from({ length: 12 }, (_, i) => trade(i)),
			5
		);
		renderLedger();
		await screen.findByTestId('trade-ledger-table');
		expect(getTradeHistory).toHaveBeenCalledTimes(3);
		expect(screen.getByTestId('trade-ledger-summary')).toHaveTextContent(
			'12 trades'
		);
	});

	it('paginates across all pages', async () => {
		mockTrades(Array.from({ length: 25 }, (_, i) => trade(i)));
		renderLedger();
		await screen.findByTestId('trade-ledger-table');
		expect(screen.getAllByTestId('trade-ledger-row')).toHaveLength(10);
		expect(screen.getByTestId('trade-ledger-summary')).toHaveTextContent(
			'Page 1 of 3'
		);
		expect(screen.getByTestId('trade-ledger-prev')).toBeDisabled();

		fireEvent.click(screen.getByTestId('trade-ledger-next'));
		fireEvent.click(screen.getByTestId('trade-ledger-next'));
		expect(screen.getAllByTestId('trade-ledger-row')).toHaveLength(5);
		expect(screen.getByTestId('trade-ledger-summary')).toHaveTextContent(
			'Page 3 of 3'
		);
		expect(screen.getByTestId('trade-ledger-next')).toBeDisabled();
	});

	it('filters by key name and resets to the first page', async () => {
		mockTrades(Array.from({ length: 25 }, (_, i) => trade(i)));
		renderLedger();
		await screen.findByTestId('trade-ledger-table');
		fireEvent.click(screen.getByTestId('trade-ledger-next'));

		fireEvent.change(screen.getByTestId('trade-ledger-search'), {
			target: { value: 'key 7' },
		});
		const rows = screen.getAllByTestId('trade-ledger-row');
		expect(rows).toHaveLength(1);
		expect(within(rows[0]).getByText('Key 7')).toBeInTheDocument();
		expect(screen.getByTestId('trade-ledger-summary')).toHaveTextContent(
			'Page 1 of 1'
		);
	});

	it('filters by date range', async () => {
		mockTrades([
			trade(1, { keyName: 'Early', timestamp: T('2026-09-01T10:00:00Z') }),
			trade(2, { keyName: 'Late', timestamp: T('2026-10-10T10:00:00Z') }),
		]);
		renderLedger();
		await screen.findByTestId('trade-ledger-table');
		fireEvent.change(screen.getByTestId('trade-ledger-from'), {
			target: { value: '2026-10-01' },
		});
		const rows = screen.getAllByTestId('trade-ledger-row');
		expect(rows).toHaveLength(1);
		expect(within(rows[0]).getByText('Late')).toBeInTheDocument();
	});

	it('exports every matching row, not just the current page', async () => {
		mockTrades(Array.from({ length: 25 }, (_, i) => trade(i)));
		renderLedger();
		await screen.findByTestId('trade-ledger-table');
		expect(screen.getAllByTestId('trade-ledger-row')).toHaveLength(10);

		fireEvent.click(screen.getByTestId('trade-ledger-export'));
		expect(downloadCsv).toHaveBeenCalledTimes(1);
		const [filename, csv] = downloadCsv.mock.calls[0] as [string, string];
		expect(filename).toMatch(
			/^accesslayer-trade-history-\d{4}-\d{2}-\d{2}\.csv$/
		);
		expect(csv.split('\r\n')).toHaveLength(26); // header + 25 rows
	});

	it('exports only the rows that match the filters', async () => {
		mockTrades(Array.from({ length: 25 }, (_, i) => trade(i)));
		renderLedger();
		await screen.findByTestId('trade-ledger-table');
		fireEvent.change(screen.getByTestId('trade-ledger-search'), {
			target: { value: 'Key 1' }, // Key 1, Key 10..19 = 11 rows
		});
		fireEvent.click(screen.getByTestId('trade-ledger-export'));
		const csv = downloadCsv.mock.calls[0][1] as string;
		expect(csv.split('\r\n')).toHaveLength(12);
	});

	it('shows an empty state when there is no trade history', async () => {
		mockTrades([]);
		renderLedger();
		expect(
			await screen.findByTestId('trade-ledger-empty')
		).toBeInTheDocument();
	});

	it('shows a no-matches state with a way to clear filters', async () => {
		mockTrades([trade(0)]);
		renderLedger();
		await screen.findByTestId('trade-ledger-table');
		fireEvent.change(screen.getByTestId('trade-ledger-search'), {
			target: { value: 'zzz' },
		});
		expect(screen.getByTestId('trade-ledger-no-matches')).toBeInTheDocument();
		expect(screen.getByTestId('trade-ledger-export')).toBeDisabled();
		fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
		await waitFor(() =>
			expect(screen.getAllByTestId('trade-ledger-row')).toHaveLength(1)
		);
	});

	it('shows an error state when loading fails', async () => {
		getTradeHistory.mockRejectedValue(new Error('nope'));
		renderLedger();
		expect(
			await screen.findByTestId('trade-ledger-error')
		).toBeInTheDocument();
	});
});
