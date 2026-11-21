import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CircuitBreakerStatusIndicator from '../CircuitBreakerStatusIndicator';
import { CIRCUIT_BREAKER_TOOLTIP_EXPLANATION } from '@/utils/circuitBreaker.utils';

describe('CircuitBreakerStatusIndicator (#1034)', () => {
	it('renders price impact percentage in safe/normal state', () => {
		render(
			<CircuitBreakerStatusIndicator
				impactPercent={2.5}
				thresholdPercent={15}
				isValid={true}
			/>
		);

		expect(
			screen.getByTestId('circuit-breaker-status-indicator')
		).toBeInTheDocument();
		expect(screen.getByTestId('circuit-breaker-impact-value')).toHaveTextContent(
			'+2.50%'
		);
		expect(
			screen.queryByTestId('circuit-breaker-warning-banner')
		).not.toBeInTheDocument();
		expect(
			screen.queryByTestId('circuit-breaker-breach-banner')
		).not.toBeInTheDocument();
	});

	it('renders approaching warning banner when price impact reaches proximity threshold', () => {
		// 12% is 80% of 15%
		render(
			<CircuitBreakerStatusIndicator
				impactPercent={12.5}
				thresholdPercent={15}
				isValid={true}
			/>
		);

		expect(screen.getByTestId('circuit-breaker-impact-value')).toHaveTextContent(
			'+12.50%'
		);
		const warningBanner = screen.getByTestId('circuit-breaker-warning-banner');
		expect(warningBanner).toBeInTheDocument();
		expect(warningBanner).toHaveAttribute('role', 'alert');
		expect(warningBanner).toHaveTextContent(/approaching circuit breaker limit/i);
		expect(
			screen.queryByTestId('circuit-breaker-breach-banner')
		).not.toBeInTheDocument();
	});

	it('renders breach banner when price impact equals or exceeds threshold', () => {
		render(
			<CircuitBreakerStatusIndicator
				impactPercent={15.0}
				thresholdPercent={15}
				isValid={true}
			/>
		);

		const breachBanner = screen.getByTestId('circuit-breaker-breach-banner');
		expect(breachBanner).toBeInTheDocument();
		expect(breachBanner).toHaveAttribute('role', 'alert');
		expect(breachBanner).toHaveTextContent(/circuit breaker triggered/i);
		expect(
			screen.queryByTestId('circuit-breaker-warning-banner')
		).not.toBeInTheDocument();
	});

	it('renders breach banner when price impact far exceeds threshold', () => {
		render(
			<CircuitBreakerStatusIndicator
				impactPercent={28.4}
				thresholdPercent={15}
				isValid={true}
			/>
		);

		expect(screen.getByTestId('circuit-breaker-impact-value')).toHaveTextContent(
			'+28.40%'
		);
		expect(
			screen.getByTestId('circuit-breaker-breach-banner')
		).toBeInTheDocument();
	});

	it('displays tooltip explaining circuit breaker purpose clearly', () => {
		render(
			<CircuitBreakerStatusIndicator
				impactPercent={4.0}
				thresholdPercent={15}
				isValid={true}
			/>
		);

		const trigger = screen.getByTestId('circuit-breaker-tooltip-trigger');
		expect(trigger).toHaveAttribute(
			'aria-label',
			'Explain circuit breaker protection'
		);

		// Tooltip initially hidden
		expect(
			screen.queryByTestId('circuit-breaker-tooltip-content')
		).not.toBeInTheDocument();

		// Click to reveal
		fireEvent.click(trigger);
		const tooltipContent = screen.getByTestId('circuit-breaker-tooltip-content');
		expect(tooltipContent).toBeInTheDocument();
		expect(tooltipContent).toHaveTextContent(CIRCUIT_BREAKER_TOOLTIP_EXPLANATION);
		expect(tooltipContent).toHaveTextContent(/slippage/i);

		// Press Escape to dismiss
		fireEvent.keyDown(trigger, { key: 'Escape' });
		expect(
			screen.queryByTestId('circuit-breaker-tooltip-content')
		).not.toBeInTheDocument();
	});

	it('does not render when isValid is false or impact is null/undefined', () => {
		const { container, rerender } = render(
			<CircuitBreakerStatusIndicator
				impactPercent={5}
				isValid={false}
			/>
		);
		expect(container.firstChild).toBeNull();

		rerender(
			<CircuitBreakerStatusIndicator
				impactPercent={null}
				isValid={true}
			/>
		);
		expect(container.firstChild).toBeNull();
	});

	it('respects key-configured thresholdBps', () => {
		// 1000 bps = 10%. 8% is 80% of 10%
		render(
			<CircuitBreakerStatusIndicator
				impactPercent={8.5}
				thresholdBps={1000}
				isValid={true}
			/>
		);

		expect(
			screen.getByTestId('circuit-breaker-warning-banner')
		).toBeInTheDocument();
		expect(
			screen.getByText(/approaching circuit breaker limit \(10%\)/i)
		).toBeInTheDocument();
	});
});
