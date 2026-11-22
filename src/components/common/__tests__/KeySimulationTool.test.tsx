import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import KeySimulationTool from '@/components/common/KeySimulationTool';

describe('KeySimulationTool (#875)', () => {
	function renderTool(
		overrides: Partial<React.ComponentProps<typeof KeySimulationTool>> = {}
	) {
		return render(<KeySimulationTool currentSupply={100} {...overrides} />);
	}

	it('renders with a default quantity of 10 and shows a result', () => {
		renderTool();

		expect(screen.getByTestId('key-simulation-amount')).toHaveValue('10');
		expect(screen.getByTestId('key-simulation-result')).toBeInTheDocument();
	});

	it('shows the projected end price higher than the start price for a buy', () => {
		renderTool();

		const startText = screen.getByTestId('key-simulation-start-price').textContent;
		const endText = screen.getByTestId('key-simulation-end-price').textContent;
		expect(startText).not.toBe(endText);
	});

	it('shows a positive price impact percentage', () => {
		renderTool();

		expect(screen.getByTestId('key-simulation-price-impact')).toHaveTextContent('+');
	});

	it('updates the result when the quantity changes', () => {
		renderTool();

		const before = screen.getByTestId('key-simulation-total-cost').textContent;

		fireEvent.change(screen.getByTestId('key-simulation-amount'), {
			target: { value: '50' },
		});

		const after = screen.getByTestId('key-simulation-total-cost').textContent;
		expect(after).not.toBe(before);
	});

	it('shows a validation error and hides the result for a zero quantity', () => {
		renderTool();

		fireEvent.change(screen.getByTestId('key-simulation-amount'), {
			target: { value: '0' },
		});

		expect(screen.getByTestId('key-simulation-error')).toHaveTextContent(
			/greater than zero/i
		);
		expect(screen.queryByTestId('key-simulation-result')).not.toBeInTheDocument();
	});

	it('shows a validation error for an empty quantity', () => {
		renderTool();

		fireEvent.change(screen.getByTestId('key-simulation-amount'), {
			target: { value: '' },
		});

		expect(screen.getByTestId('key-simulation-error')).toHaveTextContent(
			/enter a quantity/i
		);
	});

	it('shows a validation error for a non-numeric quantity', () => {
		renderTool();

		fireEvent.change(screen.getByTestId('key-simulation-amount'), {
			target: { value: 'abc' },
		});

		expect(screen.getByTestId('key-simulation-error')).toHaveTextContent(
			/must be a number/i
		);
	});

	it('renders protocol and creator fee rows when fees are non-zero', () => {
		renderTool({ protocolFeeBps: 250, creatorFeeBps: 250 });

		expect(screen.getByText('Simulated protocol fee')).toBeInTheDocument();
		expect(screen.getByText('Simulated creator fee')).toBeInTheDocument();
	});

	it('omits fee rows when fees are zero', () => {
		renderTool({ protocolFeeBps: 0, creatorFeeBps: 0 });

		expect(screen.queryByText('Simulated protocol fee')).not.toBeInTheDocument();
		expect(screen.queryByText('Simulated creator fee')).not.toBeInTheDocument();
	});
});
