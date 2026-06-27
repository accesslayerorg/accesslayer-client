import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TradeDialog from '@/components/common/TradeDialog';
import { BUY_QUANTITY_BOUNDS } from '@/constants/fees';

describe('TradeDialog buy quantity clamping and notes', () => {
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

	it('clamps values below minimum to minimum on blur', () => {
		renderDialog();
		const input = screen.getByTestId('trade-dialog-amount') as HTMLInputElement;

		// Input below minimum
		fireEvent.change(input, { target: { value: '0' } });
		fireEvent.blur(input);

		expect(input.value).toBe(BUY_QUANTITY_BOUNDS.MIN_QTY.toString());
		expect(screen.getByTestId('buy-qty-adjustment-note')).toHaveTextContent(
			`Quantity adjusted to the minimum of ${BUY_QUANTITY_BOUNDS.MIN_QTY}.`
		);
	});

	it('clamps values above maximum to maximum on blur', () => {
		renderDialog();
		const input = screen.getByTestId('trade-dialog-amount') as HTMLInputElement;

		// Input above maximum
		fireEvent.change(input, { target: { value: '150' } });
		fireEvent.blur(input);

		expect(input.value).toBe(BUY_QUANTITY_BOUNDS.MAX_QTY.toString());
		expect(screen.getByTestId('buy-qty-adjustment-note')).toHaveTextContent(
			`Quantity adjusted to the maximum of ${BUY_QUANTITY_BOUNDS.MAX_QTY}.`
		);
	});

	it('rounds decimal inputs on blur', () => {
		renderDialog();
		const input = screen.getByTestId('trade-dialog-amount') as HTMLInputElement;

		// Decimal input
		fireEvent.change(input, { target: { value: '5.6' } });
		fireEvent.blur(input);

		expect(input.value).toBe('6');
		expect(screen.getByTestId('buy-qty-adjustment-note')).toHaveTextContent(
			'Quantity rounded to 6.'
		);
	});

	it('does not clamp or show a note for valid quantities on blur', () => {
		renderDialog();
		const input = screen.getByTestId('trade-dialog-amount') as HTMLInputElement;

		// Valid quantity
		fireEvent.change(input, { target: { value: '10' } });
		fireEvent.blur(input);

		expect(input.value).toBe('10');
		expect(screen.queryByTestId('buy-qty-adjustment-note')).not.toBeInTheDocument();
	});

	it('clears the adjustment note on input change', () => {
		renderDialog();
		const input = screen.getByTestId('trade-dialog-amount') as HTMLInputElement;

		// Trigger adjustment note
		fireEvent.change(input, { target: { value: '0' } });
		fireEvent.blur(input);
		expect(screen.getByTestId('buy-qty-adjustment-note')).toBeInTheDocument();

		// Change input
		fireEvent.change(input, { target: { value: '5' } });
		expect(screen.queryByTestId('buy-qty-adjustment-note')).not.toBeInTheDocument();
	});
});
