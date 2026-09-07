import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TradeDialog from '@/components/common/TradeDialog';

function renderTradeDialog(
	overrides: Partial<React.ComponentProps<typeof TradeDialog>> = {}
) {
	return render(
		<TradeDialog
			open
			side="buy"
			creatorName="Alice"
			availableHoldings={10}
			onOpenChange={vi.fn()}
			onConfirm={vi.fn()}
			{...overrides}
		/>
	);
}

describe('TradeDialog amount keyboard shortcuts', () => {
	it('sets amount to 1 when "1" is pressed while amount input is focused', async () => {
		const user = userEvent.setup();
		renderTradeDialog();

		const amountInput = screen.getByTestId('trade-dialog-amount');
		await user.click(amountInput);

		// Clear and type 5 first (shortcut '5' sets preset 10)
		await user.clear(amountInput);
		await user.type(amountInput, '5');
		expect(amountInput).toHaveValue('10');

		// Press "1" to set amount to 1
		await user.keyboard('{1}');
		expect(amountInput).toHaveValue('1');
	});

	it('sets amount to 2 when "2" is pressed', async () => {
		const user = userEvent.setup();
		renderTradeDialog();

		const amountInput = screen.getByTestId('trade-dialog-amount');
		await user.click(amountInput);
		await user.clear(amountInput);

		await user.keyboard('{2}');
		expect(amountInput).toHaveValue('2');
	});

	it('sets amount to 5 when "4" is pressed', async () => {
		const user = userEvent.setup();
		renderTradeDialog();

		const amountInput = screen.getByTestId('trade-dialog-amount');
		await user.click(amountInput);
		await user.clear(amountInput);

		await user.keyboard('{4}');
		expect(amountInput).toHaveValue('5');
	});

	it('sets amount to 10 when "5" is pressed', async () => {
		const user = userEvent.setup();
		renderTradeDialog();

		const amountInput = screen.getByTestId('trade-dialog-amount');
		await user.click(amountInput);
		await user.clear(amountInput);

		await user.keyboard('{5}');
		expect(amountInput).toHaveValue('10');
	});

	it('increments amount by 1 when "+" is pressed', async () => {
		const user = userEvent.setup();
		renderTradeDialog();

		const amountInput = screen.getByTestId('trade-dialog-amount');
		await user.click(amountInput);
		await user.clear(amountInput);
		await user.type(amountInput, '3');

		await user.keyboard('{+}');
		expect(amountInput).toHaveValue('4');
	});

	it('decrements amount by 1 when "-" is pressed', async () => {
		const user = userEvent.setup();
		renderTradeDialog();

		const amountInput = screen.getByTestId('trade-dialog-amount');
		await user.click(amountInput);
		await user.clear(amountInput);
		await user.type(amountInput, '5');

		await user.keyboard('{-}');
		expect(amountInput).toHaveValue('9');
	});

	it('does not decrement below 1', async () => {
		const user = userEvent.setup();
		renderTradeDialog();

		const amountInput = screen.getByTestId('trade-dialog-amount');
		await user.click(amountInput);
		await user.clear(amountInput);
		await user.type(amountInput, '1');

		await user.keyboard('{-}');
		expect(amountInput).toHaveValue('1');
	});

	it('does not intercept keyboard shortcuts when amount input is not focused', async () => {
		const user = userEvent.setup();
		renderTradeDialog();

		// Focus the confirm button instead
		const confirmButton = screen.getByTestId('trade-dialog-confirm');
		await user.click(confirmButton);

		const amountInput = screen.getByTestId('trade-dialog-amount');

		// Press "1" — should not set the amount since input is not focused
		await user.keyboard('{1}');
		expect(amountInput).toHaveValue('1');
	});

	it('shows shortcut hint bar', () => {
		renderTradeDialog();

		expect(screen.getByTestId('trade-dialog-shortcut-hint')).toBeInTheDocument();
	});
});
