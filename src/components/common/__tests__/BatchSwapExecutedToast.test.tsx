import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import BatchSwapExecutedToast from '../BatchSwapExecutedToast';
import type { BatchSwapReceipt } from '@/types/batchTrade.types';

const mockReceipt: BatchSwapReceipt = {
	success: true,
	transactionHash: '0xabc123456789def0',
	totalCostStroops: 35_000_000,
	items: [
		{
			keyId: 'k1',
			keyName: 'Alice Explorer',
			direction: 'buy',
			amount: 2,
			costStroops: 20_000_000,
			success: true,
		},
		{
			keyId: 'k2',
			keyName: 'Bob Creator',
			direction: 'sell',
			amount: 1,
			costStroops: 15_000_000,
			success: true,
		},
	],
};

describe('BatchSwapExecutedToast (#1155)', () => {
	it('renders title and per-item summary with direction, amount, key name, and cost', () => {
		render(
			<BatchSwapExecutedToast toastId="test-toast" receipt={mockReceipt} />
		);

		expect(screen.getByTestId('batch-swap-executed-toast')).toBeInTheDocument();
		expect(screen.getByText('Batch Swap Executed')).toBeInTheDocument();

		const items = screen.getAllByTestId('batch-swap-toast-item');
		expect(items).toHaveLength(2);

		// First item: BUY 2x Alice Explorer
		expect(items[0]).toHaveTextContent('buy');
		expect(items[0]).toHaveTextContent('2x');
		expect(items[0]).toHaveTextContent('Alice Explorer');

		// Second item: SELL 1x Bob Creator
		expect(items[1]).toHaveTextContent('sell');
		expect(items[1]).toHaveTextContent('1x');
		expect(items[1]).toHaveTextContent('Bob Creator');
	});

	it('renders transaction hash and total outlay', () => {
		render(
			<BatchSwapExecutedToast toastId="test-toast" receipt={mockReceipt} />
		);

		expect(screen.getByText(/total outlay/i)).toBeInTheDocument();
		expect(
			screen.getByDisplayValue('0xabc123456789def0')
		).toBeInTheDocument();
	});
});
