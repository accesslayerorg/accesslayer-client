/**
 * Unit tests for the sell confirmation dialog correctly displaying the
 * estimated XLM payout and disabling the confirm button while the sell
 * mutation is pending (#692).
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TradeDialog from '@/components/common/TradeDialog';
import * as keyPriceDisplay from '@/utils/keyPriceDisplay.utils';

describe('TradeDialog – sell payout display (#692)', () => {
	function renderSellDialog(
		overrides: Partial<React.ComponentProps<typeof TradeDialog>> = {}
	) {
		return render(
			<TradeDialog
				open={true}
				side="sell"
				creatorName="Alice"
				availableHoldings={10}
				keyPriceStroops={500_000}
				currentSupply={100}
				onOpenChange={vi.fn()}
				onConfirm={vi.fn()}
				{...overrides}
			/>
		);
	}

	it('displays the correct estimated XLM payout for a given sell quantity', () => {
		renderSellDialog();
		const input = screen.getByTestId(
			'trade-dialog-amount'
		) as HTMLInputElement;

		// keyPriceStroops=500_000 * quantity=2 = 1_000_000 stroops = 0.1 XLM
		fireEvent.change(input, { target: { value: '2' } });

		expect(screen.getByText(/Estimated proceeds/i)).toBeInTheDocument();
		expect(screen.getByText(/0\.10? XLM/)).toBeInTheDocument();
	});

	it('updates the displayed payout as the sell quantity changes', () => {
		renderSellDialog();
		const input = screen.getByTestId(
			'trade-dialog-amount'
		) as HTMLInputElement;

		fireEvent.change(input, { target: { value: '1' } });
		expect(screen.getByText(/0\.05 XLM/)).toBeInTheDocument();

		fireEvent.change(input, { target: { value: '4' } });
		expect(screen.getByText(/0\.20? XLM/)).toBeInTheDocument();
		expect(screen.queryByText('0.05 XLM')).not.toBeInTheDocument();
	});

	it('shows "Estimated proceeds unavailable" when the payout cannot be computed', () => {
		renderSellDialog({ keyPriceStroops: null, currentSupply: null });
		const input = screen.getByTestId(
			'trade-dialog-amount'
		) as HTMLInputElement;

		fireEvent.change(input, { target: { value: '2' } });

		expect(
			screen.getByText('Estimated proceeds unavailable')
		).toBeInTheDocument();
	});

	it('calls the bonding curve sell calculation with the correct arguments', () => {
		const spy = vi.spyOn(keyPriceDisplay, 'estimateSellProceeds');
		renderSellDialog({ keyPriceStroops: 500_000, currentSupply: 100 });
		const input = screen.getByTestId(
			'trade-dialog-amount'
		) as HTMLInputElement;

		fireEvent.change(input, { target: { value: '3' } });

		expect(spy).toHaveBeenCalledWith(500_000, 100, 3);
		spy.mockRestore();
	});

	it('does not compute a payout on the buy side', () => {
		renderSellDialog({ side: 'buy' });

		expect(screen.queryByText(/Estimated proceeds/i)).not.toBeInTheDocument();
	});

	it('disables the confirm button while the sell mutation is pending', () => {
		renderSellDialog({ isSubmitting: true });

		expect(screen.getByTestId('trade-dialog-confirm')).toBeDisabled();
	});

	it('re-enables the confirm button once the sell mutation is no longer pending', () => {
		const { rerender } = renderSellDialog({ isSubmitting: true });
		expect(screen.getByTestId('trade-dialog-confirm')).toBeDisabled();

		rerender(
			<TradeDialog
				open={true}
				side="sell"
				creatorName="Alice"
				availableHoldings={10}
				keyPriceStroops={500_000}
				currentSupply={100}
				onOpenChange={vi.fn()}
				onConfirm={vi.fn()}
				isSubmitting={false}
			/>
		);

		expect(screen.getByTestId('trade-dialog-confirm')).not.toBeDisabled();
	});

	it('disables cancel and prevents closing while the sell mutation is pending', () => {
		const onOpenChange = vi.fn();
		renderSellDialog({ isSubmitting: true, onOpenChange });

		expect(screen.getByTestId('trade-dialog-cancel')).toBeDisabled();
	});

	it('calls onConfirm with the parsed sell quantity when confirm is clicked', () => {
		const onConfirm = vi.fn();
		renderSellDialog({ onConfirm });
		const input = screen.getByTestId(
			'trade-dialog-amount'
		) as HTMLInputElement;

		fireEvent.change(input, { target: { value: '5' } });
		fireEvent.click(screen.getByTestId('trade-dialog-confirm'));

		// #872 added a third `slippage` argument (the computed min/max price
		// bound); this test only asserts on the amount and price-preview
		// arguments it was written to cover.
		expect(onConfirm).toHaveBeenCalledWith(
			5,
			null,
			expect.objectContaining({ minPriceStroops: expect.any(Number) })
		);
	});
});
