import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BatchTradeDrawer from '../BatchTradeDrawer';
import { useBatchTradeStore } from '@/hooks/useBatchTradeStore';
import { useBatchSwapMutation } from '@/hooks/useBatchSwap';
import type { BatchTradeItem } from '@/types/batchTrade.types';

const mockMutate = vi.fn();

vi.mock('@/hooks/useBatchSwap', () => ({
	useBatchSwapMutation: vi.fn(),
}));

vi.mock('@/utils/toast.util', () => ({
	default: {
		success: vi.fn(),
		error: vi.fn(),
		loading: vi.fn(),
		message: vi.fn(),
	},
}));

const alphaItem: BatchTradeItem = {
	keyId: 'key-1',
	keyName: 'Alpha Key',
	priceStroops: 10_000_000,
	amount: 2,
	direction: 'buy',
	slippageTolerance: 1,
	currentSupply: 100,
};

const betaItem: BatchTradeItem = {
	keyId: 'key-2',
	keyName: 'Beta Key',
	priceStroops: 20_000_000,
	amount: 1,
	direction: 'sell',
	slippageTolerance: 2.5,
	currentSupply: 50,
};

describe('BatchTradeDrawer (#1155)', () => {
	beforeEach(() => {
		window.sessionStorage.clear();
		useBatchTradeStore.setState({ items: [], isOpen: true });
		mockMutate.mockReset();
		vi.mocked(useBatchSwapMutation).mockReturnValue({
			mutate: mockMutate,
			isPending: false,
		} as unknown as ReturnType<typeof useBatchSwapMutation>);
	});

	it('shows an empty state when queue has no items', () => {
		render(<BatchTradeDrawer open onClose={vi.fn()} />);

		expect(
			screen.getByText('Your batch trade queue is empty')
		).toBeInTheDocument();
		expect(screen.getByTestId('batch-submit-button')).toBeDisabled();
	});

	it('lists every queued item with name, amount, direction, and slippage controls', () => {
		useBatchTradeStore.setState({ items: [alphaItem, betaItem] });

		render(<BatchTradeDrawer open onClose={vi.fn()} />);

		const names = screen.getAllByTestId('batch-item-name');
		expect(names[0]).toHaveTextContent('Alpha Key');
		expect(names[1]).toHaveTextContent('Beta Key');

		const amounts = screen.getAllByTestId('batch-item-amount');
		expect(amounts[0]).toHaveValue(2);
		expect(amounts[1]).toHaveValue(1);

		const slippages = screen.getAllByTestId('batch-item-slippage');
		expect(slippages[0]).toHaveValue(1);
		expect(slippages[1]).toHaveValue(2.5);

		expect(screen.getByTestId('batch-total-cost')).toBeInTheDocument();
		expect(screen.getByTestId('batch-price-impact')).toBeInTheDocument();
		expect(screen.getByTestId('batch-submit-button')).not.toBeDisabled();
	});

	it('updates per-item amount in the store on input change', () => {
		useBatchTradeStore.setState({ items: [alphaItem] });

		render(<BatchTradeDrawer open onClose={vi.fn()} />);

		const amountInput = screen.getByTestId('batch-item-amount');
		fireEvent.change(amountInput, { target: { value: '5' } });

		expect(useBatchTradeStore.getState().items[0].amount).toBe(5);
	});

	it('updates per-item slippage tolerance correctly on input change', () => {
		useBatchTradeStore.setState({ items: [alphaItem] });

		render(<BatchTradeDrawer open onClose={vi.fn()} />);

		const slippageInput = screen.getByTestId('batch-item-slippage');
		fireEvent.change(slippageInput, { target: { value: '3.5' } });

		expect(useBatchTradeStore.getState().items[0].slippageTolerance).toBe(3.5);
	});

	it('toggles direction between buy and sell in drawer', async () => {
		const user = userEvent.setup();
		useBatchTradeStore.setState({ items: [alphaItem] });

		render(<BatchTradeDrawer open onClose={vi.fn()} />);

		const sellButton = screen.getByRole('radio', { name: /sell/i });
		await user.click(sellButton);

		expect(useBatchTradeStore.getState().items[0].direction).toBe('sell');
	});

	it('removes an item from the batch when remove button clicked', async () => {
		const user = userEvent.setup();
		useBatchTradeStore.setState({ items: [alphaItem, betaItem] });

		render(<BatchTradeDrawer open onClose={vi.fn()} />);

		const removeButtons = screen.getAllByTestId('batch-item-remove');
		await user.click(removeButtons[0]);

		expect(useBatchTradeStore.getState().items).toEqual([betaItem]);
	});

	it('clears all items when Clear all is clicked', async () => {
		const user = userEvent.setup();
		useBatchTradeStore.setState({ items: [alphaItem, betaItem] });

		render(<BatchTradeDrawer open onClose={vi.fn()} />);

		await user.click(screen.getByTestId('batch-clear-all'));

		expect(useBatchTradeStore.getState().items).toEqual([]);
		expect(
			screen.getByText('Your batch trade queue is empty')
		).toBeInTheDocument();
	});

	it('submits batch when Submit Batch button is clicked', async () => {
		const user = userEvent.setup();
		useBatchTradeStore.setState({ items: [alphaItem] });

		render(<BatchTradeDrawer open onClose={vi.fn()} />);

		const submitButton = screen.getByTestId('batch-submit-button');
		await user.click(submitButton);

		expect(mockMutate).toHaveBeenCalledOnce();
	});
});
