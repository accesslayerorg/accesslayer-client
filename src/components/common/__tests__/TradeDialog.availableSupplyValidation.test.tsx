/**
 * Unit tests for the buy-side quantity input enforcing a minimum of 1 and a
 * maximum equal to the creator's available supply (#753).
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TradeDialog from '../TradeDialog';

describe('TradeDialog available-supply quantity validation (#753)', () => {
	function renderBuyDialog(
		overrides: Partial<React.ComponentProps<typeof TradeDialog>> = {}
	) {
		return render(
			<TradeDialog
				open={true}
				side="buy"
				creatorName="Alex Rivers"
				availableHoldings={0}
				availableSupply={100}
				onOpenChange={vi.fn()}
				onConfirm={vi.fn()}
				{...overrides}
			/>
		);
	}

	it("shows 'Minimum quantity is 1' when the quantity is 0", () => {
		renderBuyDialog();
		const input = screen.getByTestId('trade-dialog-amount');
		fireEvent.change(input, { target: { value: '0' } });

		expect(screen.getByTestId('trade-dialog-amount-error')).toHaveTextContent(
			'Minimum quantity is 1'
		);
	});

	it("shows 'Minimum quantity is 1' when the quantity is negative", () => {
		renderBuyDialog();
		const input = screen.getByTestId('trade-dialog-amount');
		fireEvent.change(input, { target: { value: '-4' } });

		expect(screen.getByTestId('trade-dialog-amount-error')).toHaveTextContent(
			'Minimum quantity is 1'
		);
	});

	it("shows 'Exceeds available supply' when the quantity is above the available supply", () => {
		renderBuyDialog({ availableSupply: 50 });
		const input = screen.getByTestId('trade-dialog-amount');
		fireEvent.change(input, { target: { value: '51' } });

		expect(screen.getByTestId('trade-dialog-amount-error')).toHaveTextContent(
			'Exceeds available supply'
		);
	});

	it('passes validation when the quantity exactly equals the available supply', () => {
		renderBuyDialog({ availableSupply: 50 });
		const input = screen.getByTestId('trade-dialog-amount');
		fireEvent.change(input, { target: { value: '50' } });

		expect(
			screen.queryByTestId('trade-dialog-amount-error')
		).not.toBeInTheDocument();
	});

	it('shows no error for a valid quantity within range', () => {
		renderBuyDialog({ availableSupply: 50 });
		const input = screen.getByTestId('trade-dialog-amount');
		fireEvent.change(input, { target: { value: '10' } });

		expect(
			screen.queryByTestId('trade-dialog-amount-error')
		).not.toBeInTheDocument();
	});

	it('disables the confirm button while the available-supply error is active', () => {
		renderBuyDialog({ availableSupply: 50 });
		const input = screen.getByTestId('trade-dialog-amount');
		fireEvent.change(input, { target: { value: '51' } });

		expect(screen.getByTestId('trade-dialog-confirm')).toBeDisabled();
	});

	it('disables the confirm button while the minimum-quantity error is active', () => {
		renderBuyDialog();
		const input = screen.getByTestId('trade-dialog-amount');
		fireEvent.change(input, { target: { value: '0' } });

		expect(screen.getByTestId('trade-dialog-confirm')).toBeDisabled();
	});

	it('does not apply the available-supply ceiling when availableSupply is null (unlimited)', () => {
		renderBuyDialog({ availableSupply: null });
		const input = screen.getByTestId('trade-dialog-amount');
		fireEvent.change(input, { target: { value: '100000' } });

		expect(
			screen.queryByTestId('trade-dialog-amount-error')
		).not.toBeInTheDocument();
	});

	it('does not apply the minimum-quantity or available-supply rules on the sell side', () => {
		render(
			<TradeDialog
				open={true}
				side="sell"
				creatorName="Alex Rivers"
				availableHoldings={5}
				availableSupply={50}
				onOpenChange={vi.fn()}
				onConfirm={vi.fn()}
			/>
		);
		const input = screen.getByTestId('trade-dialog-amount');
		fireEvent.change(input, { target: { value: '0' } });

		// Sell side keeps its own zero-quantity message, not the buy-side one.
		const error = screen.getByTestId('trade-dialog-amount-error');
		expect(error).toHaveTextContent('Amount must be greater than zero.');
		expect(error).not.toHaveTextContent('Minimum quantity is 1');
	});
});
