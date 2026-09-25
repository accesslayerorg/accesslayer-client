/**
 * Unit tests for the sell quantity input rejecting values exceeding the
 * wallet's current holding (#657).
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TradeDialog from '@/components/common/TradeDialog';

describe('TradeDialog – sell quantity exceeds-holding validation', () => {
	function renderSellDialog(
		overrides: Partial<React.ComponentProps<typeof TradeDialog>> = {}
	) {
		return render(
			<TradeDialog
				open={true}
				side="sell"
				creatorName="Alice"
				availableHoldings={3}
				onOpenChange={vi.fn()}
				onConfirm={vi.fn()}
				{...overrides}
			/>
		);
	}

	it('shows an exceeds-balance validation error when the quantity exceeds the holding', () => {
		renderSellDialog();
		const input = screen.getByTestId(
			'trade-dialog-amount'
		) as HTMLInputElement;

		fireEvent.change(input, { target: { value: '4' } });

		const error = screen.getByTestId('trade-dialog-amount-error');
		expect(error).toBeInTheDocument();
		expect(error).toHaveTextContent(
			"You can't sell more than your holdings (3 keys)."
		);
	});

	it('clears the validation error when the quantity is brought back within range', () => {
		renderSellDialog();
		const input = screen.getByTestId(
			'trade-dialog-amount'
		) as HTMLInputElement;

		fireEvent.change(input, { target: { value: '4' } });
		expect(
			screen.getByTestId('trade-dialog-amount-error')
		).toBeInTheDocument();

		fireEvent.change(input, { target: { value: '3' } });
		expect(
			screen.queryByTestId('trade-dialog-amount-error')
		).not.toBeInTheDocument();
	});

	it('shows a distinct zero-quantity error, not the exceeds-balance error', () => {
		renderSellDialog();
		const input = screen.getByTestId(
			'trade-dialog-amount'
		) as HTMLInputElement;

		fireEvent.change(input, { target: { value: '0' } });

		const error = screen.getByTestId('trade-dialog-amount-error');
		expect(error).toBeInTheDocument();
		expect(error).toHaveTextContent('Amount must be greater than zero.');
		expect(error).not.toHaveTextContent('holdings');
	});

	it('accepts a quantity equal to the holding without any error', () => {
		renderSellDialog();
		const input = screen.getByTestId(
			'trade-dialog-amount'
		) as HTMLInputElement;

		fireEvent.change(input, { target: { value: '3' } });

		expect(
			screen.queryByTestId('trade-dialog-amount-error')
		).not.toBeInTheDocument();
	});

	it('accepts quantity 1 (well within holding) without any error', () => {
		renderSellDialog();
		const input = screen.getByTestId(
			'trade-dialog-amount'
		) as HTMLInputElement;

		fireEvent.change(input, { target: { value: '1' } });

		expect(
			screen.queryByTestId('trade-dialog-amount-error')
		).not.toBeInTheDocument();
	});

	it('disables the confirm button while the exceeds-balance error is present', () => {
		renderSellDialog();
		const input = screen.getByTestId(
			'trade-dialog-amount'
		) as HTMLInputElement;

		fireEvent.change(input, { target: { value: '4' } });

		expect(screen.getByTestId('trade-dialog-confirm')).toBeDisabled();
	});
});

describe('TradeDialog buy max quantity validation (#880)', () => {
	function renderBuyDialog(
		overrides: Partial<React.ComponentProps<typeof TradeDialog>> = {}
	) {
		return render(
			<TradeDialog
				open={true}
				side="buy"
				creatorName="Alice"
				availableHoldings={0}
				onOpenChange={vi.fn()}
				onConfirm={vi.fn()}
				maxBuyQuantity={3}
				{...overrides}
			/>
		);
	}

	it('warns and disables confirm when quantity exceeds maxBuyQuantity', () => {
		renderBuyDialog();
		const input = screen.getByTestId(
			'trade-dialog-amount'
		) as HTMLInputElement;

		fireEvent.change(input, { target: { value: '4' } });

		expect(screen.getByTestId('trade-dialog-amount-error')).toHaveTextContent(
			'Maximum 3 keys per transaction for this key'
		);
		expect(screen.getByTestId('trade-dialog-confirm')).toBeDisabled();
	});

	it('hides the warning at or below maxBuyQuantity', () => {
		renderBuyDialog();
		const input = screen.getByTestId(
			'trade-dialog-amount'
		) as HTMLInputElement;

		fireEvent.change(input, { target: { value: '3' } });

		expect(
			screen.queryByTestId('trade-dialog-amount-error')
		).not.toBeInTheDocument();
		expect(screen.getByTestId('trade-dialog-confirm')).not.toBeDisabled();
	});

	it('does not warn when maxBuyQuantity is null', () => {
		renderBuyDialog({ maxBuyQuantity: null });
		const input = screen.getByTestId(
			'trade-dialog-amount'
		) as HTMLInputElement;

		fireEvent.change(input, { target: { value: '4' } });

		expect(
			screen.queryByTestId('trade-dialog-amount-error')
		).not.toBeInTheDocument();
		expect(screen.getByTestId('trade-dialog-confirm')).not.toBeDisabled();
	});
});
