import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TradeConfirmationModal from '../TradeConfirmationModal';

describe('TradeConfirmationModal', () => {
	it('renders buy confirmation modal with correct max_price bound', () => {
		const onConfirm = vi.fn();
		const onCancel = vi.fn();

		render(
			<TradeConfirmationModal
				open={true}
				onOpenChange={vi.fn()}
				side="buy"
				creatorName="Alex Rivers"
				amount={5}
				unitPriceStroops={1_000_000}
				totalStroops={5_000_000}
				slippageTolerancePercent={1}
				maxPriceStroops={5_050_000}
				priceImpactPercent={2.5}
				onConfirm={onConfirm}
				onCancel={onCancel}
			/>
		);

		expect(
			screen.getByTestId('trade-confirmation-modal-title')
		).toHaveTextContent('Confirm Buy Order');
		expect(
			screen.getByTestId('confirmation-modal-side-badge')
		).toHaveTextContent('buy');
		expect(screen.getByTestId('confirmation-modal-amount')).toHaveTextContent(
			'5 keys'
		);
		expect(
			screen.getByTestId('confirmation-modal-total')
		).toBeInTheDocument();
		expect(
			screen.getByTestId('confirmation-modal-slippage')
		).toHaveTextContent('1%');
		expect(
			screen.getByTestId('confirmation-modal-max-price')
		).toBeInTheDocument();
		// Price impact 2.5% is <= 5%, so no warning
		expect(
			screen.queryByTestId('price-impact-warning')
		).not.toBeInTheDocument();

		// Click confirm
		fireEvent.click(screen.getByTestId('confirmation-modal-confirm'));
		expect(onConfirm).toHaveBeenCalledTimes(1);

		// Click cancel
		fireEvent.click(screen.getByTestId('confirmation-modal-cancel'));
		expect(onCancel).toHaveBeenCalledTimes(1);
	});

	it('renders sell confirmation modal with correct min_price bound', () => {
		render(
			<TradeConfirmationModal
				open={true}
				onOpenChange={vi.fn()}
				side="sell"
				creatorName="Alex Rivers"
				amount={2}
				unitPriceStroops={1_000_000}
				totalStroops={2_000_000}
				slippageTolerancePercent={2}
				minPriceStroops={1_960_000}
				priceImpactPercent={3.0}
				onConfirm={vi.fn()}
			/>
		);

		expect(
			screen.getByTestId('trade-confirmation-modal-title')
		).toHaveTextContent('Confirm Sell Order');
		expect(
			screen.getByTestId('confirmation-modal-side-badge')
		).toHaveTextContent('sell');
		expect(
			screen.getByTestId('confirmation-modal-slippage')
		).toHaveTextContent('2%');
		expect(
			screen.getByTestId('confirmation-modal-min-price')
		).toBeInTheDocument();
	});

	it('displays price impact warning when impact exceeds 5%', () => {
		render(
			<TradeConfirmationModal
				open={true}
				onOpenChange={vi.fn()}
				side="buy"
				creatorName="Alex Rivers"
				amount={10}
				unitPriceStroops={1_000_000}
				totalStroops={10_000_000}
				slippageTolerancePercent={1}
				maxPriceStroops={10_100_000}
				priceImpactPercent={7.5}
				onConfirm={vi.fn()}
			/>
		);

		expect(screen.getByTestId('price-impact-warning')).toBeInTheDocument();
		expect(screen.getByTestId('price-impact-value')).toHaveTextContent(
			'+7.50%'
		);
	});

	it('disables buttons when submitting', () => {
		render(
			<TradeConfirmationModal
				open={true}
				onOpenChange={vi.fn()}
				side="buy"
				creatorName="Alex Rivers"
				amount={1}
				slippageTolerancePercent={1}
				maxPriceStroops={1_010_000}
				onConfirm={vi.fn()}
				isSubmitting={true}
			/>
		);

		expect(screen.getByTestId('confirmation-modal-confirm')).toBeDisabled();
		expect(screen.getByTestId('confirmation-modal-cancel')).toBeDisabled();
	});
});
