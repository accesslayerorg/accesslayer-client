import {
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TransactionHistoryView } from '@/pages/TransactionHistoryPage';
import type {
	GetWalletTransactionsParams,
	WalletTransaction,
	WalletTransactionPage,
	WalletTransactionType,
} from '@/services/transactionHistory.service';
import * as historyUtils from '@/utils/transactionHistory.utils';

const ADDRESS = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
const HOUR = 60 * 60 * 1000;

const TYPES: WalletTransactionType[] = [
	'buy',
	'sell',
	'stake',
	'unstake',
	'claim',
	'referral',
	'swap',
];

function makeTx(
	id: string,
	type: WalletTransactionType,
	hoursAgo: number
): WalletTransaction {
	return {
		id,
		type,
		keyName: `Creator ${id}`,
		amount: 10,
		direction: type === 'buy' || type === 'stake' ? 'out' : 'in',
		fee: 0.01,
		timestamp: Date.now() - hoursAgo * HOUR,
		txHash: `hash-${id}`,
	};
}

/** Fake API that honours type, range and cursor params. */
function makeFakeApi(all: WalletTransaction[], pageSize = 100) {
	return vi.fn(
		async ({
			types,
			from,
			to,
			cursor,
		}: GetWalletTransactionsParams): Promise<WalletTransactionPage> => {
			const matching = all.filter(
				tx =>
					(!types || types.includes(tx.type)) &&
					(from === undefined || tx.timestamp >= from) &&
					(to === undefined || tx.timestamp <= to)
			);
			const start = cursor ? Number(cursor) : 0;
			const end = start + pageSize;
			return {
				items: matching.slice(start, end),
				nextCursor: end < matching.length ? String(end) : null,
			};
		}
	);
}

function getRowIds() {
	const list = screen.getByTestId('transaction-history-list');
	return within(list)
		.getAllByRole('listitem')
		.map(li =>
			li.getAttribute('data-testid')?.replace('transaction-row-', '')
		);
}

afterEach(() => {
	vi.restoreAllMocks();
});

// Multi-step render flows; allow headroom on loaded CI runners.
describe('TransactionHistoryView', { timeout: 15_000 }, () => {
	it('renders every event type with its icon and description', async () => {
		const all = TYPES.map((type, i) => makeTx(type, type, i + 1));
		render(
			<TransactionHistoryView
				address={ADDRESS}
				fetchPage={makeFakeApi(all)}
			/>
		);

		await screen.findByTestId('transaction-history-list');

		for (const type of TYPES) {
			const row = screen.getByTestId(`transaction-row-${type}`);
			expect(
				within(row).getByTestId(`transaction-icon-${type}`)
			).toBeInTheDocument();
			expect(row).toHaveTextContent(
				historyUtils.describeTransaction(all.find(t => t.type === type)!)
			);
			expect(row).toHaveTextContent('Fee 0.01 XLM');
		}
		expect(screen.getByTestId('transaction-row-referral')).toHaveTextContent(
			'+10 XLM'
		);
		expect(screen.getByTestId('transaction-row-buy')).toHaveTextContent(
			'−10 XLM'
		);
	});

	it('narrows results with the type filter and sends the types to the API', async () => {
		const all = TYPES.map((type, i) => makeTx(type, type, i + 1));
		const fetchPage = makeFakeApi(all);
		render(
			<TransactionHistoryView address={ADDRESS} fetchPage={fetchPage} />
		);
		await screen.findByTestId('transaction-history-list');

		fireEvent.click(screen.getByRole('button', { name: 'Stakes' }));

		await waitFor(() => expect(getRowIds()).toEqual(['stake', 'unstake']));
		expect(fetchPage).toHaveBeenLastCalledWith(
			expect.objectContaining({ types: ['stake', 'unstake'] })
		);
		expect(screen.getByRole('button', { name: 'Stakes' })).toHaveAttribute(
			'aria-pressed',
			'true'
		);
	});

	it('drops rows outside the filter even if the API ignores it', async () => {
		const all = [makeTx('a', 'buy', 1), makeTx('b', 'swap', 2)];
		const ignoresFilters = vi.fn(async () => ({
			items: all,
			nextCursor: null,
		}));
		render(
			<TransactionHistoryView address={ADDRESS} fetchPage={ignoresFilters} />
		);
		await screen.findByTestId('transaction-history-list');

		fireEvent.click(screen.getByRole('button', { name: 'Swaps' }));
		await waitFor(() => expect(getRowIds()).toEqual(['b']));
	});

	it('applies date presets and custom ranges', async () => {
		const all = [
			makeTx('recent', 'buy', 1),
			makeTx('week', 'buy', 24 * 5),
			makeTx('month', 'buy', 24 * 20),
			makeTx('old', 'buy', 24 * 60),
		];
		render(
			<TransactionHistoryView
				address={ADDRESS}
				fetchPage={makeFakeApi(all)}
			/>
		);

		// Default preset is 30 days.
		await waitFor(() =>
			expect(getRowIds()).toEqual(['recent', 'week', 'month'])
		);

		fireEvent.click(screen.getByRole('button', { name: '7 days' }));
		await waitFor(() => expect(getRowIds()).toEqual(['recent', 'week']));

		fireEvent.click(screen.getByRole('button', { name: 'All time' }));
		await waitFor(() =>
			expect(getRowIds()).toEqual(['recent', 'week', 'month', 'old'])
		);

		fireEvent.click(screen.getByRole('button', { name: 'Custom' }));
		const day = (d: Date) =>
			`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
		const old = new Date(all[3].timestamp);
		fireEvent.change(screen.getByLabelText('From'), {
			target: { value: day(old) },
		});
		fireEvent.change(screen.getByLabelText('To'), {
			target: { value: day(old) },
		});
		await waitFor(() => expect(getRowIds()).toEqual(['old']));
	});

	it('flags an inverted custom range without fetching', async () => {
		const fetchPage = makeFakeApi([makeTx('a', 'buy', 1)]);
		render(
			<TransactionHistoryView address={ADDRESS} fetchPage={fetchPage} />
		);
		await screen.findByTestId('transaction-history-list');
		const callsBefore = fetchPage.mock.calls.length;

		fireEvent.click(screen.getByRole('button', { name: 'Custom' }));
		fireEvent.change(screen.getByLabelText('From'), {
			target: { value: '2026-10-10' },
		});
		fireEvent.change(screen.getByLabelText('To'), {
			target: { value: '2026-10-01' },
		});

		expect(await screen.findByRole('alert')).toHaveTextContent(
			/start date must be on or before/i
		);
		expect(fetchPage.mock.calls.length).toBe(callsBefore);
	});

	it('exports the filtered rows to CSV', async () => {
		const all = [
			makeTx('a', 'buy', 1),
			makeTx('b', 'claim', 2),
			makeTx('c', 'buy', 3),
		];
		const download = vi
			.spyOn(historyUtils, 'downloadCsv')
			.mockImplementation(() => {});
		render(
			<TransactionHistoryView
				address={ADDRESS}
				fetchPage={makeFakeApi(all)}
			/>
		);
		await screen.findByTestId('transaction-history-list');

		fireEvent.click(screen.getByRole('button', { name: 'Buys' }));
		await waitFor(() => expect(getRowIds()).toEqual(['a', 'c']));

		fireEvent.click(screen.getByRole('button', { name: /export csv/i }));

		expect(download).toHaveBeenCalledTimes(1);
		const [filename, csv] = download.mock.calls[0];
		expect(filename).toMatch(
			/^accesslayer-transactions-buys-30d-\d{4}-\d{2}-\d{2}\.csv$/
		);
		expect(csv).toBe(historyUtils.transactionsToCsv([all[0], all[2]]));
	});

	it('load more appends the next page without duplicates', async () => {
		const all = Array.from({ length: 5 }, (_, i) =>
			makeTx(`t${i}`, 'buy', i + 1)
		);
		// Page 2 overlaps page 1 by one row, as can happen when new activity
		// shifts an offset-backed cursor.
		const fetchPage = vi
			.fn<
				(p: GetWalletTransactionsParams) => Promise<WalletTransactionPage>
			>()
			.mockResolvedValueOnce({ items: all.slice(0, 3), nextCursor: 'c1' })
			.mockResolvedValueOnce({ items: all.slice(2, 5), nextCursor: null });

		render(
			<TransactionHistoryView address={ADDRESS} fetchPage={fetchPage} />
		);
		await waitFor(() => expect(getRowIds()).toEqual(['t0', 't1', 't2']));

		fireEvent.click(screen.getByRole('button', { name: 'Load more' }));

		await waitFor(() =>
			expect(getRowIds()).toEqual(['t0', 't1', 't2', 't3', 't4'])
		);
		expect(fetchPage).toHaveBeenLastCalledWith(
			expect.objectContaining({ cursor: 'c1' })
		);
		expect(
			screen.queryByRole('button', { name: 'Load more' })
		).not.toBeInTheDocument();
		expect(screen.getByText(/reached the end/i)).toBeInTheDocument();
	});

	it('shows an error state with retry', async () => {
		const fetchPage = vi
			.fn<
				(p: GetWalletTransactionsParams) => Promise<WalletTransactionPage>
			>()
			.mockRejectedValueOnce(new Error('boom'))
			.mockResolvedValue({
				items: [makeTx('a', 'buy', 1)],
				nextCursor: null,
			});
		render(
			<TransactionHistoryView address={ADDRESS} fetchPage={fetchPage} />
		);

		expect(await screen.findByRole('alert')).toHaveTextContent(
			/couldn't load/i
		);
		fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
		await waitFor(() => expect(getRowIds()).toEqual(['a']));
	});
});
