import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BuySellKeyFlow from '../BuySellKeyFlow';

describe('BuySellKeyFlow circuit breaker status indicator (#1034)', () => {
	beforeEach(() => {
		window.localStorage?.clear?.();
	});

	it('renders price impact indicator below amount input on buy side', () => {
		render(
			<BuySellKeyFlow
				creatorName="Alex Rivers"
				availableHoldings={10}
				keyPriceStroops={1_000_000}
				currentSupply={0}
				circuitBreakerThresholdPercent={15}
			/>
		);

		expect(
			screen.getByTestId('circuit-breaker-status-indicator')
		).toBeInTheDocument();
		expect(screen.getByTestId('circuit-breaker-impact-value')).toHaveTextContent(
			'+1.00%'
		);
	});

	it('updates price impact within 300ms of amount change', () => {
		render(
			<BuySellKeyFlow
				creatorName="Alex Rivers"
				availableHoldings={10}
				keyPriceStroops={1_000_000}
				currentSupply={0}
				circuitBreakerThresholdPercent={15}
			/>
		);

		const amountInput = screen.getByTestId('trade-amount-input');
		const startTime = performance.now();

		fireEvent.change(amountInput, { target: { value: '4' } });

		const elapsed = performance.now() - startTime;
		expect(elapsed).toBeLessThan(300);

		expect(screen.getByTestId('circuit-breaker-impact-value')).toHaveTextContent(
			'+4.00%'
		);
	});

	it('displays approaching warning banner when price impact reaches proximity threshold', () => {
		render(
			<BuySellKeyFlow
				creatorName="Alex Rivers"
				availableHoldings={10}
				keyPriceStroops={1_000_000}
				currentSupply={0}
				circuitBreakerThresholdPercent={15}
			/>
		);

		const amountInput = screen.getByTestId('trade-amount-input');
		fireEvent.change(amountInput, { target: { value: '13' } });

		expect(screen.getByTestId('circuit-breaker-impact-value')).toHaveTextContent(
			'+13.00%'
		);
		const warningBanner = screen.getByTestId('circuit-breaker-warning-banner');
		expect(warningBanner).toBeInTheDocument();
		expect(warningBanner).toHaveAttribute('role', 'alert');
		expect(
			screen.queryByTestId('circuit-breaker-breach-banner')
		).not.toBeInTheDocument();
	});

	it('disables review button and displays Circuit Breaker Tripped when threshold is breached', () => {
		render(
			<BuySellKeyFlow
				creatorName="Alex Rivers"
				availableHoldings={10}
				keyPriceStroops={1_000_000}
				currentSupply={0}
				circuitBreakerThresholdPercent={15}
			/>
		);

		const amountInput = screen.getByTestId('trade-amount-input');
		fireEvent.change(amountInput, { target: { value: '18' } });

		expect(screen.getByTestId('circuit-breaker-impact-value')).toHaveTextContent(
			'+18.00%'
		);
		const breachBanner = screen.getByTestId('circuit-breaker-breach-banner');
		expect(breachBanner).toBeInTheDocument();
		expect(breachBanner).toHaveAttribute('role', 'alert');

		const reviewButton = screen.getByTestId('trade-review-button');
		expect(reviewButton).toBeDisabled();
		expect(reviewButton).toHaveTextContent('Circuit Breaker Tripped');
	});

	it('does not display circuit breaker indicator when switched to sell tab', () => {
		render(
			<BuySellKeyFlow
				creatorName="Alex Rivers"
				availableHoldings={10}
				keyPriceStroops={1_000_000}
				currentSupply={0}
				circuitBreakerThresholdPercent={15}
			/>
		);

		fireEvent.click(screen.getByTestId('trade-tab-sell'));

		expect(
			screen.queryByTestId('circuit-breaker-status-indicator')
		).not.toBeInTheDocument();
	});
});
