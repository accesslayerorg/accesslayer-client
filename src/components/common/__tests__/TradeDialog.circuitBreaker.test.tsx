import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TradeDialog from '../TradeDialog';

describe('TradeDialog circuit breaker status indicator (#1034)', () => {
	beforeEach(() => {
		window.localStorage?.clear?.();
	});

	function renderDialog(
		overrides: Partial<React.ComponentProps<typeof TradeDialog>> = {}
	) {
		return render(
			<TradeDialog
				open={true}
				side="buy"
				creatorName="Alice"
				availableHoldings={10}
				keyPriceStroops={1_000_000}
				currentSupply={0} // 1% growth factor per key from supply 0
				circuitBreakerThresholdPercent={15}
				onOpenChange={vi.fn()}
				onConfirm={vi.fn()}
				{...overrides}
			/>
		);
	}

	it('computes and displays price impact correctly below amount input on buy form', () => {
		renderDialog();

		// Default quantity is 1 from supply 0 (1% price growth)
		expect(
			screen.getByTestId('circuit-breaker-status-indicator')
		).toBeInTheDocument();
		expect(screen.getByTestId('circuit-breaker-impact-value')).toHaveTextContent(
			'+1.00%'
		);
		expect(
			screen.queryByTestId('circuit-breaker-warning-banner')
		).not.toBeInTheDocument();
		expect(
			screen.queryByTestId('circuit-breaker-breach-banner')
		).not.toBeInTheDocument();
	});

	it('updates price impact within 300ms of amount input change', () => {
		renderDialog();

		const amountInput = screen.getByTestId('trade-dialog-amount');
		const startTime = performance.now();

		// Change amount to 5 keys -> ~5% impact
		fireEvent.change(amountInput, { target: { value: '5' } });

		const elapsed = performance.now() - startTime;
		expect(elapsed).toBeLessThan(300);

		expect(screen.getByTestId('circuit-breaker-impact-value')).toHaveTextContent(
			'+5.00%'
		);
	});

	it('shows warning banner when impact approaches circuit breaker threshold (>= 80%)', () => {
		// Buying 12 keys from supply 0 yields 12% impact, which is exactly 80% of 15% threshold
		renderDialog({ circuitBreakerThresholdPercent: 15 });

		const amountInput = screen.getByTestId('trade-dialog-amount');
		fireEvent.change(amountInput, { target: { value: '12' } });

		expect(screen.getByTestId('circuit-breaker-impact-value')).toHaveTextContent(
			'+12.00%'
		);
		const warningBanner = screen.getByTestId('circuit-breaker-warning-banner');
		expect(warningBanner).toBeInTheDocument();
		expect(warningBanner).toHaveAttribute('role', 'alert');
		expect(warningBanner).toHaveTextContent(/approaching circuit breaker limit \(15%\)/i);

		// Buy button is NOT disabled by circuit breaker when only approaching
		// (May require slippage override if impact > slippage tolerance, but circuit breaker is not breached)
		expect(screen.queryByTestId('circuit-breaker-breach-banner')).not.toBeInTheDocument();
	});

	it('disables buy button with circuit breaker message when threshold is breached (>= 15%)', () => {
		const onConfirm = vi.fn();
		renderDialog({ circuitBreakerThresholdPercent: 15, onConfirm });

		const amountInput = screen.getByTestId('trade-dialog-amount');
		// Buying 16 keys yields 16% impact (exceeds 15% threshold)
		fireEvent.change(amountInput, { target: { value: '16' } });

		expect(screen.getByTestId('circuit-breaker-impact-value')).toHaveTextContent(
			'+16.00%'
		);
		const breachBanner = screen.getByTestId('circuit-breaker-breach-banner');
		expect(breachBanner).toBeInTheDocument();
		expect(breachBanner).toHaveAttribute('role', 'alert');
		expect(breachBanner).toHaveTextContent(/circuit breaker triggered/i);

		const confirmButton = screen.getByTestId('trade-dialog-confirm');
		expect(confirmButton).toBeDisabled();
		expect(confirmButton).toHaveTextContent('Circuit Breaker Tripped');

		// Even if the user clicks, onConfirm should NOT be called
		fireEvent.click(confirmButton);
		expect(onConfirm).not.toHaveBeenCalled();
	});

	it('explains circuit breaker protection purpose clearly in tooltip', () => {
		renderDialog();

		const trigger = screen.getByTestId('circuit-breaker-tooltip-trigger');
		expect(trigger).toBeInTheDocument();

		fireEvent.click(trigger);
		const tooltipContent = screen.getByTestId('circuit-breaker-tooltip-content');
		expect(tooltipContent).toBeInTheDocument();
		expect(tooltipContent).toHaveTextContent(/circuit breaker protection automatically prevents orders/i);
		expect(tooltipContent).toHaveTextContent(/excessive price movement/i);
		expect(tooltipContent).toHaveTextContent(/slippage/i);
	});

	it('does not display circuit breaker indicator on sell form', () => {
		renderDialog({ side: 'sell' });

		expect(
			screen.queryByTestId('circuit-breaker-status-indicator')
		).not.toBeInTheDocument();
	});
});
