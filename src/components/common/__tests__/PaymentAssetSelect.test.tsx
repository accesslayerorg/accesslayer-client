import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PaymentAssetSelect from '../PaymentAssetSelect';
import { oracleService } from '@/services/oracle.service';

function renderWithClient(ui: React.ReactElement) {
	const client = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
		},
	});
	return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('PaymentAssetSelect (#1445)', () => {
	// 10 XLM = 100,000,000 stroops
	const quoteStroops = 100_000_000;

	beforeEach(() => {
		oracleService.reset();
	});

	it('renders asset options with balances and displays converted quote for default XLM', async () => {
		renderWithClient(<PaymentAssetSelect quoteStroops={quoteStroops} />);

		expect(
			screen.getByTestId('payment-asset-select-container')
		).toBeInTheDocument();
		expect(screen.getByTestId('payment-asset-select')).toBeInTheDocument();

		// Converted cost for 10 XLM
		expect(screen.getByTestId('converted-quote-display')).toHaveTextContent(
			'10.0000000 XLM'
		);
		expect(screen.getByTestId('rate-used-display')).toHaveTextContent(
			'1 XLM = 1 XLM'
		);
	});

	it('switching assets recalculates quote without a page reload', async () => {
		const user = userEvent.setup();
		const handleAssetChange = vi.fn();

		renderWithClient(
			<PaymentAssetSelect
				quoteStroops={quoteStroops}
				onAssetChange={handleAssetChange}
			/>
		);

		// Switch to USDC (rate 0.125 -> 10 XLM = 1.25 USDC)
		const select = screen.getByTestId('payment-asset-select');
		await user.selectOptions(select, 'USDC');

		expect(screen.getByTestId('converted-quote-display')).toHaveTextContent(
			'1.250000 USDC'
		);
		expect(screen.getByTestId('rate-used-display')).toHaveTextContent(
			'1 XLM = 0.125 USDC'
		);

		// Max pay defaults to quote + 1% slippage = 1.2625
		expect(screen.getByTestId('max-pay-input')).toHaveValue('1.262500');

		expect(handleAssetChange).toHaveBeenCalledWith(
			expect.objectContaining({
				asset: expect.objectContaining({ code: 'USDC' }),
				convertedQuote: 1.25,
				hasSufficientBalance: true,
			})
		);
	});

	it('disables assets with insufficient balance and shows the shortfall in the option', async () => {
		// EURC has 5.0 balance in mock. If quote is 1000 XLM (10,000,000,000 stroops),
		// at rate 0.115, cost is 115 EURC, so shortfall is 110 EURC.
		const largeQuoteStroops = 10_000_000_000;

		renderWithClient(
			<PaymentAssetSelect quoteStroops={largeQuoteStroops} />
		);

		const eurcOption = screen.getByTestId('payment-option-EURC');
		expect(eurcOption).toBeDisabled();
		expect(eurcOption.textContent).toContain('Insufficient - Shortfall');
	});

	it('displays a fallback warning when oracle feed uses fallback', async () => {
		// Set oracle status to fallback for XLM
		oracleService.setMockStatus('XLM', {
			source: 'fallback',
			sourceName: 'Secondary Fallback Feed',
		});

		renderWithClient(<PaymentAssetSelect quoteStroops={quoteStroops} />);

		await waitFor(() => {
			expect(
				screen.getByTestId('oracle-fallback-warning')
			).toBeInTheDocument();
		});

		expect(screen.getByTestId('oracle-fallback-warning')).toHaveTextContent(
			/Warning: Price oracle is currently using secondary fallback feed/i
		);
	});

	it('sends updated max pay when user changes the max pay input', async () => {
		const user = userEvent.setup();
		const handleAssetChange = vi.fn();

		renderWithClient(
			<PaymentAssetSelect
				quoteStroops={quoteStroops}
				onAssetChange={handleAssetChange}
			/>
		);

		const maxPayInput = screen.getByTestId('max-pay-input');
		await user.clear(maxPayInput);
		await user.type(maxPayInput, '15.5');

		expect(handleAssetChange).toHaveBeenCalledWith(
			expect.objectContaining({
				maxPay: 15.5,
			})
		);
	});
});
