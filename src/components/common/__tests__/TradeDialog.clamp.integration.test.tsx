import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TradeDialog from '@/components/common/TradeDialog';
import { BUY_QUANTITY_BOUNDS } from '@/constants/fees';

describe('TradeDialog – clampBuyQuantity integration', () => {
	function renderDialog(
		overrides: Partial<React.ComponentProps<typeof TradeDialog>> = {}
	) {
		return render(
			<TradeDialog
				open={true}
				side="buy"
				creatorName="Alice"
				availableHoldings={10}
				onOpenChange={vi.fn()}
				onConfirm={vi.fn()}
				{...overrides}
			/>
		);
	}

	it('applies clampBuyQuantity to amount input field – values below minimum are clamped to MIN_QTY', () => {
		renderDialog();
		const input = screen.getByTestId('trade-dialog-amount') as HTMLInputElement;

		// Input value below minimum
		fireEvent.change(input, { target: { value: '0' } });
		fireEvent.blur(input);

		// Verify the value is clamped to minimum
		expect(input.value).toBe(BUY_QUANTITY_BOUNDS.MIN_QTY.toString());
	});

	it('applies clampBuyQuantity to amount input field – values above maximum are clamped to MAX_QTY', () => {
		renderDialog();
		const input = screen.getByTestId('trade-dialog-amount') as HTMLInputElement;

		// Input value above maximum
		fireEvent.change(input, { target: { value: '150' } });
		fireEvent.blur(input);

		// Verify the value is clamped to maximum
		expect(input.value).toBe(BUY_QUANTITY_BOUNDS.MAX_QTY.toString());
	});

	it('applies clampBuyQuantity to amount input field – decimal values are rounded to nearest integer', () => {
		renderDialog();
		const input = screen.getByTestId('trade-dialog-amount') as HTMLInputElement;

		// Input decimal value
		fireEvent.change(input, { target: { value: '5.6' } });
		fireEvent.blur(input);

		// Verify the value is rounded
		expect(input.value).toBe('6');
	});

	it('applies clampBuyQuantity to amount input field – valid values within bounds remain unchanged', () => {
		renderDialog();
		const input = screen.getByTestId('trade-dialog-amount') as HTMLInputElement;

		// Input valid value within bounds
		fireEvent.change(input, { target: { value: '10' } });
		fireEvent.blur(input);

		// Verify the value remains unchanged
		expect(input.value).toBe('10');
	});

	it('applies clampBuyQuantity to amount input field – negative values are clamped to MIN_QTY', () => {
		renderDialog();
		const input = screen.getByTestId('trade-dialog-amount') as HTMLInputElement;

		// Input negative value
		fireEvent.change(input, { target: { value: '-5' } });
		fireEvent.blur(input);

		// Verify the value is clamped to minimum
		expect(input.value).toBe(BUY_QUANTITY_BOUNDS.MIN_QTY.toString());
	});

	it('applies clampBuyQuantity to amount input field – empty input is handled gracefully', () => {
		renderDialog();
		const input = screen.getByTestId('trade-dialog-amount') as HTMLInputElement;

		// Clear the input
		fireEvent.change(input, { target: { value: '' } });
		fireEvent.blur(input);

		// Verify empty input shows validation error (not clamped, as it's invalid)
		expect(screen.getByTestId('trade-dialog-amount-error')).toHaveTextContent(
			'Please enter an amount.'
		);
	});

	it('applies clampBuyQuantity to amount input field – boundary values (MIN_QTY and MAX_QTY) are accepted', () => {
		renderDialog();
		const input = screen.getByTestId('trade-dialog-amount') as HTMLInputElement;

		// Test minimum boundary
		fireEvent.change(input, { target: { value: BUY_QUANTITY_BOUNDS.MIN_QTY.toString() } });
		fireEvent.blur(input);
		expect(input.value).toBe(BUY_QUANTITY_BOUNDS.MIN_QTY.toString());

		// Test maximum boundary
		fireEvent.change(input, { target: { value: BUY_QUANTITY_BOUNDS.MAX_QTY.toString() } });
		fireEvent.blur(input);
		expect(input.value).toBe(BUY_QUANTITY_BOUNDS.MAX_QTY.toString());
	});

	it('applies clampBuyQuantity to amount input field – sell side also respects clamping', () => {
		renderDialog({ side: 'sell', availableHoldings: 50 });
		const input = screen.getByTestId('trade-dialog-amount') as HTMLInputElement;

		// Input value above maximum on sell side
		fireEvent.change(input, { target: { value: '150' } });
		fireEvent.blur(input);

		// Verify the value is clamped to maximum
		expect(input.value).toBe(BUY_QUANTITY_BOUNDS.MAX_QTY.toString());
	});
});
