import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BuySellKeyFlow from '../BuySellKeyFlow';
import showToast from '@/utils/toast.util';

vi.mock('@/utils/toast.util', () => ({
	default: {
		message: vi.fn(),
		success: vi.fn(),
		error: vi.fn(),
		loading: vi.fn(),
		transactionSuccess: vi.fn(),
	},
}));

const mockShowToast = vi.mocked(showToast);

describe('BuySellKeyFlow (#919)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders buy/sell input panel with amount field and max button', () => {
		render(
			<BuySellKeyFlow
				creatorName="Alex Rivers"
				availableHoldings={10}
				keyPriceStroops={1_000_000}
			/>
		);

		expect(screen.getByTestId('buy-sell-key-flow')).toBeInTheDocument();
		expect(screen.getByTestId('trade-tab-buy')).toBeInTheDocument();
		expect(screen.getByTestId('trade-tab-sell')).toBeInTheDocument();
		expect(screen.getByTestId('trade-amount-input')).toBeInTheDocument();
		expect(screen.getByTestId('trade-max-button')).toBeInTheDocument();
	});

	it('applies Max button correctly on buy and sell sides', () => {
		render(
			<BuySellKeyFlow
				creatorName="Alex Rivers"
				availableHoldings={7}
				maxBuyQuantity={25}
				keyPriceStroops={1_000_000}
			/>
		);

		const amountInput = screen.getByTestId(
			'trade-amount-input'
		) as HTMLInputElement;
		const maxButton = screen.getByTestId('trade-max-button');

		// On buy side with maxBuyQuantity=25
		fireEvent.click(maxButton);
		expect(amountInput.value).toBe('25');

		// Switch to sell side
		fireEvent.click(screen.getByTestId('trade-tab-sell'));
		fireEvent.click(maxButton);
		expect(amountInput.value).toBe('7');
	});

	it('disables Max button on sell side when holdings are 0', () => {
		render(
			<BuySellKeyFlow
				creatorName="Alex Rivers"
				availableHoldings={0}
				keyPriceStroops={1_000_000}
				initialSide="sell"
			/>
		);

		expect(screen.getByTestId('trade-max-button')).toBeDisabled();
	});

	it('renders slippage tolerance selector with 0.5%, 1%, 2% presets and custom input', () => {
		render(
			<BuySellKeyFlow
				creatorName="Alex Rivers"
				availableHoldings={10}
				keyPriceStroops={1_000_000}
			/>
		);

		expect(screen.getByTestId('slippage-preset-0.5')).toBeInTheDocument();
		expect(screen.getByTestId('slippage-preset-1')).toBeInTheDocument();
		expect(screen.getByTestId('slippage-preset-2')).toBeInTheDocument();
		expect(screen.getByTestId('slippage-custom-input')).toBeInTheDocument();
	});

	it('shows price impact warning when impact exceeds 5% threshold', () => {
		render(
			<BuySellKeyFlow
				creatorName="Alex Rivers"
				availableHoldings={50}
				keyPriceStroops={1_000_000}
				currentSupply={0} // Buying 10 from 0 supply has ~10% impact (> 5%)
			/>
		);

		const amountInput = screen.getByTestId('trade-amount-input');
		fireEvent.change(amountInput, { target: { value: '10' } });

		expect(screen.getByTestId('price-impact-warning')).toBeInTheDocument();
		expect(screen.getByTestId('price-impact-value')).toBeInTheDocument();
	});

	it('does not show price impact warning when impact is within 5%', () => {
		render(
			<BuySellKeyFlow
				creatorName="Alex Rivers"
				availableHoldings={50}
				keyPriceStroops={1_000_000}
				currentSupply={100} // Buying 1 key from 100 supply has < 5% impact
			/>
		);

		const amountInput = screen.getByTestId('trade-amount-input');
		fireEvent.change(amountInput, { target: { value: '1' } });

		expect(
			screen.queryByTestId('price-impact-warning')
		).not.toBeInTheDocument();
	});

	it('opens confirmation modal displaying correct max_price bound for buy before submission', () => {
		render(
			<BuySellKeyFlow
				creatorName="Alex Rivers"
				availableHoldings={10}
				keyPriceStroops={1_000_000} // 0.1 XLM
				currentSupply={10}
				protocolFeeBps={0}
				creatorFeeBps={0}
			/>
		);

		const amountInput = screen.getByTestId('trade-amount-input');
		fireEvent.change(amountInput, { target: { value: '5' } });

		// Select 2% slippage tolerance
		fireEvent.click(screen.getByTestId('slippage-preset-2'));

		// Click review order button
		fireEvent.click(screen.getByTestId('trade-review-button'));

		// Confirmation modal should open
		expect(
			screen.getByTestId('trade-confirmation-modal')
		).toBeInTheDocument();
		expect(
			screen.getByTestId('trade-confirmation-modal-title')
		).toHaveTextContent('Confirm Buy Order');
		expect(screen.getByTestId('confirmation-modal-amount')).toHaveTextContent(
			'5 keys'
		);
		expect(
			screen.getByTestId('confirmation-modal-slippage')
		).toHaveTextContent('2%');
		expect(
			screen.getByTestId('confirmation-modal-max-price')
		).toBeInTheDocument();
	});

	it('opens confirmation modal displaying correct min_price bound for sell before submission', () => {
		render(
			<BuySellKeyFlow
				creatorName="Alex Rivers"
				availableHoldings={10}
				keyPriceStroops={1_000_000}
				currentSupply={10}
				initialSide="sell"
			/>
		);

		const amountInput = screen.getByTestId('trade-amount-input');
		fireEvent.change(amountInput, { target: { value: '3' } });

		fireEvent.click(screen.getByTestId('slippage-preset-1'));
		fireEvent.click(screen.getByTestId('trade-review-button'));

		expect(
			screen.getByTestId('trade-confirmation-modal')
		).toBeInTheDocument();
		expect(
			screen.getByTestId('trade-confirmation-modal-title')
		).toHaveTextContent('Confirm Sell Order');
		expect(
			screen.getByTestId('confirmation-modal-slippage')
		).toHaveTextContent('1%');
		expect(
			screen.getByTestId('confirmation-modal-min-price')
		).toBeInTheDocument();
	});

	it('submits transaction with correct slippage params and gives toast feedback', async () => {
		const onSubmitTrade = vi.fn().mockResolvedValue(undefined);
		const onSuccess = vi.fn();

		render(
			<BuySellKeyFlow
				creatorName="Alex Rivers"
				availableHoldings={10}
				keyPriceStroops={1_000_000}
				protocolFeeBps={0}
				creatorFeeBps={0}
				onSubmitTrade={onSubmitTrade}
				onSuccess={onSuccess}
			/>
		);

		const amountInput = screen.getByTestId('trade-amount-input');
		fireEvent.change(amountInput, { target: { value: '2' } });

		// Select 0.5% slippage
		fireEvent.click(screen.getByTestId('slippage-preset-0.5'));

		// Open confirmation modal
		fireEvent.click(screen.getByTestId('trade-review-button'));
		expect(
			screen.getByTestId('trade-confirmation-modal')
		).toBeInTheDocument();

		// Submit from confirmation modal
		fireEvent.click(screen.getByTestId('confirmation-modal-confirm'));

		// Check loading toast
		expect(mockShowToast.loading).toHaveBeenCalledWith(
			'Submitting buy for 2 keys...'
		);

		await waitFor(() => {
			expect(onSubmitTrade).toHaveBeenCalledWith(
				expect.objectContaining({
					side: 'buy',
					amount: 2,
					slippageTolerancePercent: 0.5,
					maxPriceStroops: 2_010_000, // 2_000_000 * 1.005
				})
			);
		});

		// Check success toast
		await waitFor(() => {
			expect(mockShowToast.transactionSuccess).toHaveBeenCalledWith(
				'Trade confirmed',
				'Bought 2 keys from Alex Rivers'
			);
		});

		expect(onSuccess).toHaveBeenCalled();
	});

	it('handles transaction error with error toast notification and keeps modal open', async () => {
		const onSubmitTrade = vi
			.fn()
			.mockRejectedValue(new Error('User rejected signature'));
		const onError = vi.fn();

		render(
			<BuySellKeyFlow
				creatorName="Alex Rivers"
				availableHoldings={10}
				keyPriceStroops={1_000_000}
				initialSide="sell"
				onSubmitTrade={onSubmitTrade}
				onError={onError}
			/>
		);

		const amountInput = screen.getByTestId('trade-amount-input');
		fireEvent.change(amountInput, { target: { value: '1' } });

		fireEvent.click(screen.getByTestId('trade-review-button'));
		fireEvent.click(screen.getByTestId('confirmation-modal-confirm'));

		await waitFor(() => {
			expect(mockShowToast.error).toHaveBeenCalled();
		});

		expect(onError).toHaveBeenCalled();
		// Modal stays open for retry
		expect(
			screen.getByTestId('trade-confirmation-modal')
		).toBeInTheDocument();
	});
});
