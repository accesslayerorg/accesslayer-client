import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SwapConfirmationModal from '../SwapConfirmationModal';

describe('SwapConfirmationModal', () => {
	it('shows expected price, price impact and minimum received in the swap confirmation modal', () => {
		const onConfirm = vi.fn();

		render(
			<SwapConfirmationModal
				open={true}
				onOpenChange={vi.fn()}
				side="buy"
				creatorName="Alex Rivers"
				amount={5}
				unitPriceStroops={20_000_000} // 2 XLM
				totalStroops={100_000_000} // 10 XLM
				expectedPrice={2}
				priceImpactPercent={1.25}
				slippageTolerancePercent={1}
				onConfirm={onConfirm}
			/>
		);

		// Assert title and side
		expect(
			screen.getByTestId('swap-confirmation-modal-title')
		).toHaveTextContent('Confirm Buy Swap');
		expect(screen.getByTestId('swap-modal-side-badge')).toHaveTextContent(
			'buy'
		);

		// Assert expected price
		expect(screen.getByTestId('expected-price')).toBeInTheDocument();
		expect(screen.getByTestId('expected-price')).toHaveTextContent('2 XLM');

		// Assert price impact
		expect(screen.getByTestId('price-impact')).toBeInTheDocument();
		expect(screen.getByTestId('price-impact')).toHaveTextContent('1.25%');

		// Assert minimum received
		expect(screen.getByTestId('minimum-received')).toBeInTheDocument();
	});

	it('selecting a preset updates the tolerance and the displayed minimum received immediately', () => {
		const quote = {
			side: 'sell' as const,
			amount: 10,
			expectedProceeds: 1000,
		};

		render(
			<SwapConfirmationModal
				open={true}
				onOpenChange={vi.fn()}
				side="sell"
				amount={10}
				expectedPrice={100}
				totalStroops={10_000_000_000}
				quote={quote}
				slippageTolerancePercent={1}
				onConfirm={vi.fn()}
			/>
		);

		// With 1% on 1000: minReceived is 990 XLM
		expect(screen.getByTestId('minimum-received')).toHaveTextContent('990');

		// Click 3% preset button
		fireEvent.click(screen.getByTestId('slippage-preset-3'));

		// Minimum received should immediately update to 970 (1000 * 0.97)
		expect(screen.getByTestId('minimum-received')).toHaveTextContent('970');

		// Click 0.5% preset button
		fireEvent.click(screen.getByTestId('slippage-preset-0.5'));

		// Minimum received should immediately update to 995 (1000 * 0.995)
		expect(screen.getByTestId('minimum-received')).toHaveTextContent('995');
	});

	it('custom values outside 0.01%–50% show an inline error and disable confirm', () => {
		const onConfirm = vi.fn();

		render(
			<SwapConfirmationModal
				open={true}
				onOpenChange={vi.fn()}
				side="buy"
				amount={5}
				expectedPrice={2}
				slippageTolerancePercent={1}
				onConfirm={onConfirm}
			/>
		);

		const confirmBtn = screen.getByTestId('swap-confirmation-modal-confirm');
		expect(confirmBtn).not.toBeDisabled();

		const input = screen.getByTestId('slippage-custom-input');

		// Test negative value
		fireEvent.change(input, { target: { value: '-1' } });
		expect(screen.getByTestId('slippage-custom-error')).toHaveTextContent(
			/cannot be negative/i
		);
		expect(confirmBtn).toBeDisabled();

		// Test above 50%
		fireEvent.change(input, { target: { value: '60' } });
		expect(screen.getByTestId('slippage-custom-error')).toHaveTextContent(
			/cannot exceed 50%/i
		);
		expect(confirmBtn).toBeDisabled();

		// Test below 0.01%
		fireEvent.change(input, { target: { value: '0' } });
		expect(screen.getByTestId('slippage-custom-error')).toHaveTextContent(
			/at least 0\.01%/i
		);
		expect(confirmBtn).toBeDisabled();

		// Restore valid value
		fireEvent.change(input, { target: { value: '2.5' } });
		expect(
			screen.queryByTestId('slippage-custom-error')
		).not.toBeInTheDocument();
		expect(confirmBtn).not.toBeDisabled();
	});

	it('displays high-tolerance warning banner when tolerance exceeds 5%', () => {
		render(
			<SwapConfirmationModal
				open={true}
				onOpenChange={vi.fn()}
				side="buy"
				amount={1}
				expectedPrice={10}
				slippageTolerancePercent={6}
				onConfirm={vi.fn()}
			/>
		);

		expect(screen.getByTestId('slippage-high-warning')).toBeInTheDocument();
		expect(screen.getByTestId('slippage-warning-text')).toHaveTextContent(
			/high slippage tolerance/i
		);
	});

	it('passes the derived bounds to onConfirm when submitted', async () => {
		const onConfirm = vi.fn();
		const quote = {
			side: 'buy' as const,
			amount: 10,
			expectedCost: 1000,
		};

		render(
			<SwapConfirmationModal
				open={true}
				onOpenChange={vi.fn()}
				side="buy"
				amount={10}
				quote={quote}
				slippageTolerancePercent={1}
				onConfirm={onConfirm}
			/>
		);

		fireEvent.click(screen.getByTestId('swap-confirmation-modal-confirm'));
		expect(onConfirm).toHaveBeenCalledTimes(1);
		expect(onConfirm).toHaveBeenCalledWith(
			expect.objectContaining({
				maxSpent: 1010,
				tolerancePercent: 1,
			})
		);
	});
});
