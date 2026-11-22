import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddToBatchButton from '../AddToBatchButton';
import { useBatchTradeStore } from '@/hooks/useBatchTradeStore';

vi.mock('@/utils/toast.util', () => ({
	default: {
		success: vi.fn(),
		error: vi.fn(),
		loading: vi.fn(),
		message: vi.fn(),
	},
}));

describe('AddToBatchButton (#1155)', () => {
	beforeEach(() => {
		window.sessionStorage.clear();
		useBatchTradeStore.setState({ items: [] });
	});

	it('renders direction buttons, amount input, and Add to Batch button', () => {
		render(
			<AddToBatchButton
				keyId="key-1"
				keyName="Alpha Key"
				priceStroops={10_000_000}
			/>
		);

		expect(screen.getByTestId('add-to-batch-direction-buy')).toBeInTheDocument();
		expect(screen.getByTestId('add-to-batch-direction-sell')).toBeInTheDocument();
		expect(screen.getByTestId('add-to-batch-amount')).toHaveValue(1);
		expect(screen.getByTestId('add-to-batch-button')).toHaveTextContent(
			'Add to Batch'
		);
	});

	it('adds key with chosen direction and amount to batch on click', async () => {
		const user = userEvent.setup();
		render(
			<AddToBatchButton
				keyId="key-1"
				keyName="Alpha Key"
				priceStroops={10_000_000}
			/>
		);

		// Switch to Sell
		await user.click(screen.getByTestId('add-to-batch-direction-sell'));

		// Change amount to 3
		const amountInput = screen.getByTestId('add-to-batch-amount');
		fireEvent.change(amountInput, { target: { value: '3' } });

		// Click Add to Batch
		await user.click(screen.getByTestId('add-to-batch-button'));

		expect(useBatchTradeStore.getState().items).toEqual([
			expect.objectContaining({
				keyId: 'key-1',
				keyName: 'Alpha Key',
				direction: 'sell',
				amount: 3,
			}),
		]);
		expect(screen.getByTestId('add-to-batch-button')).toHaveTextContent(
			'In Batch'
		);
	});

	it('removes the key from batch when clicked again with same settings', async () => {
		const user = userEvent.setup();
		render(
			<AddToBatchButton
				keyId="key-1"
				keyName="Alpha Key"
				priceStroops={10_000_000}
			/>
		);

		await user.click(screen.getByTestId('add-to-batch-button'));
		expect(useBatchTradeStore.getState().items).toHaveLength(1);

		// Click again -> removes
		await user.click(screen.getByTestId('add-to-batch-button'));
		expect(useBatchTradeStore.getState().items).toEqual([]);
		expect(screen.getByTestId('add-to-batch-button')).toHaveTextContent(
			'Add to Batch'
		);
	});

	it('stays disabled when disabled prop is set', async () => {
		const user = userEvent.setup();
		render(
			<AddToBatchButton
				keyId="key-1"
				keyName="Alpha Key"
				priceStroops={10_000_000}
				disabled
				disabledReason="Key is currently frozen"
			/>
		);

		const button = screen.getByTestId('add-to-batch-button');
		expect(button).toBeDisabled();

		await user.click(button);
		expect(useBatchTradeStore.getState().items).toEqual([]);
	});
});
