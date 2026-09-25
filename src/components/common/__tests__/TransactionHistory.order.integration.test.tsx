import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TransactionHistory, {
	type Transaction,
} from '@/components/common/TransactionHistory';

const trades: Transaction[] = [
	{
		id: 'ledger-1000',
		type: 'buy',
		creatorId: 'creator-c',
		creatorHandle: 'nova',
		amount: 1,
		price: 8,
		timestamp: 1_000,
		txHash: '0xccc',
		status: 'completed',
	},
	{
		id: 'ledger-3000',
		type: 'buy',
		creatorId: 'creator-a',
		creatorHandle: 'atlas',
		amount: 5,
		price: 12,
		timestamp: 3_000,
		txHash: '0xaaa',
		status: 'completed',
	},
	{
		id: 'ledger-2000',
		type: 'sell',
		creatorId: 'creator-b',
		creatorHandle: 'beacon',
		amount: 2,
		price: 10,
		timestamp: 2_000,
		txHash: '0xbbb',
		status: 'completed',
	},
];

beforeEach(() => {
	vi.stubEnv('NODE_ENV', 'test');
	localStorage.clear();
});

describe('TransactionHistory – wallet activity order and type labels (integration)', () => {
	it('renders trades in descending chronological order with correct buy and sell labels', () => {
		render(<TransactionHistory transactions={trades} />);

		const rows = screen
			.getAllByTestId(/activity-item-/)
			.map(row => row.textContent ?? '');

		expect(rows).toHaveLength(3);
		expect(rows[0]).toContain('@atlas');
		expect(rows[1]).toContain('@beacon');
		expect(rows[2]).toContain('@nova');

		const buyRows = screen.getAllByTestId('activity-item-buy');
		const sellRows = screen.getAllByTestId('activity-item-sell');

		expect(within(buyRows[0]).getByText('Buy')).toBeInTheDocument();
		expect(within(buyRows[1]).getByText('Buy')).toBeInTheDocument();
		expect(within(sellRows[0]).getByText('Sell')).toBeInTheDocument();
		expect(buyRows).toHaveLength(2);
		expect(sellRows).toHaveLength(1);
		expect(rows[0]).toContain('5 keys');
		expect(rows[1]).toContain('2 keys');
		expect(rows[2]).toContain('1 keys');
	});
});
