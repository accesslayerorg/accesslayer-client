import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TradeDialog from '../TradeDialog';

describe('TradeDialog slippage protection controls (#919)', () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	it('sets amount to available holdings when MAX is clicked on sell side', () => {
		render(
			<TradeDialog
				open={true}
				side="sell"
				creatorName="Alex Rivers"
				availableHoldings={8}
				keyPriceStroops={1_000_000}
				currentSupply={100}
				onOpenChange={vi.fn()}
				onConfirm={vi.fn()}
			/>
		);

		const amountInput = screen.getByTestId(
			'trade-dialog-amount'
		) as HTMLInputElement;
		const maxButton = screen.getByTestId('trade-dialog-max-button');

		fireEvent.click(maxButton);
		expect(amountInput.value).toBe('8');
	});

	it('sets amount to maxBuyQuantity when MAX is clicked on buy side', () => {
		render(
			<TradeDialog
				open={true}
				side="buy"
				creatorName="Alex Rivers"
				availableHoldings={5}
				maxBuyQuantity={15}
				keyPriceStroops={1_000_000}
				currentSupply={100}
				onOpenChange={vi.fn()}
				onConfirm={vi.fn()}
			/>
		);

		const amountInput = screen.getByTestId(
			'trade-dialog-amount'
		) as HTMLInputElement;
		const maxButton = screen.getByTestId('trade-dialog-max-button');

		fireEvent.click(maxButton);
		expect(amountInput.value).toBe('15');
	});

	it('disables MAX button on sell side when holdings are 0', () => {
		render(
			<TradeDialog
				open={true}
				side="sell"
				creatorName="Alex Rivers"
				availableHoldings={0}
				keyPriceStroops={1_000_000}
				currentSupply={100}
				onOpenChange={vi.fn()}
				onConfirm={vi.fn()}
			/>
		);

		expect(screen.getByTestId('trade-dialog-max-button')).toBeDisabled();
	});

	it('displays price impact warning when impact exceeds 5%', () => {
		render(
			<TradeDialog
				open={true}
				side="buy"
				creatorName="Alex Rivers"
				availableHoldings={10}
				keyPriceStroops={1_000_000}
				currentSupply={0} // Buying 10 from 0 supply has ~10% impact (> 5%)
				onOpenChange={vi.fn()}
				onConfirm={vi.fn()}
			/>
		);

		const amountInput = screen.getByTestId('trade-dialog-amount');
		fireEvent.change(amountInput, { target: { value: '10' } });

		expect(screen.getByTestId('price-impact-warning')).toBeInTheDocument();
		expect(
			screen.getByTestId('price-impact-override-checkbox')
		).toBeInTheDocument();
		expect(screen.getByTestId('trade-dialog-confirm')).toBeDisabled();
	});

	it('requires acknowledgement for high impact and submits after it is checked', () => {
		const onConfirm = vi.fn();
		render(
			<TradeDialog
				open={true}
				side="buy"
				creatorName="Alex Rivers"
				availableHoldings={10}
				keyPriceStroops={1_000_000}
				currentSupply={0}
				onOpenChange={vi.fn()}
				onConfirm={onConfirm}
			/>
		);

		fireEvent.change(screen.getByTestId('trade-dialog-amount'), {
			target: { value: '10' },
		});
		const confirmButton = screen.getByTestId('trade-dialog-confirm');
		expect(confirmButton).toBeDisabled();
		fireEvent.click(screen.getByTestId('price-impact-override-checkbox'));
		expect(confirmButton).toBeEnabled();
		fireEvent.click(confirmButton);
		expect(onConfirm).toHaveBeenCalledOnce();
	});

	it('requires a new acknowledgement when the quoted trade amount changes', () => {
		render(
			<TradeDialog
				open={true}
				side="buy"
				creatorName="Alex Rivers"
				availableHoldings={10}
				keyPriceStroops={1_000_000}
				currentSupply={0}
				onOpenChange={vi.fn()}
				onConfirm={vi.fn()}
			/>
		);
		fireEvent.change(screen.getByTestId('trade-dialog-amount'), {
			target: { value: '10' },
		});
		fireEvent.click(screen.getByTestId('price-impact-override-checkbox'));
		expect(screen.getByTestId('trade-dialog-confirm')).toBeEnabled();

		fireEvent.change(screen.getByTestId('trade-dialog-amount'), {
			target: { value: '9' },
		});
		expect(screen.getByTestId('trade-dialog-confirm')).toBeDisabled();
	});

	it('opens confirmation modal showing correct price bounds when requireConfirmation is true', async () => {
		const onConfirm = vi.fn();

		render(
			<TradeDialog
				open={true}
				side="buy"
				creatorName="Alex Rivers"
				availableHoldings={10}
				keyPriceStroops={1_000_000}
				protocolFeeBps={0}
				creatorFeeBps={0}
				requireConfirmation={true}
				onOpenChange={vi.fn()}
				onConfirm={onConfirm}
			/>
		);

		const amountInput = screen.getByTestId('trade-dialog-amount');
		fireEvent.change(amountInput, { target: { value: '3' } });
		if (screen.queryByTestId('price-impact-override-checkbox')) {
			fireEvent.click(screen.getByTestId('price-impact-override-checkbox'));
		}

		// Click confirm in dialog
		fireEvent.click(screen.getByTestId('trade-dialog-confirm'));

		// Confirmation modal should open
		expect(
			screen.getByTestId('trade-confirmation-modal')
		).toBeInTheDocument();
		expect(
			screen.getByTestId('confirmation-modal-max-price')
		).toBeInTheDocument();

		// Submit from confirmation modal
		fireEvent.click(screen.getByTestId('confirmation-modal-confirm'));

		await waitFor(() => {
			expect(onConfirm).toHaveBeenCalled();
		});
	});
});
