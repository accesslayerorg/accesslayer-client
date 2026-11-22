import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SlippageSettings from '../SlippageSettings';

describe('SlippageSettings Component', () => {
	it('renders preset buttons (0.5%, 1%, 3%) and custom input', () => {
		render(<SlippageSettings value={1} />);

		expect(screen.getByTestId('slippage-preset-0.5')).toHaveTextContent(
			'0.5%'
		);
		expect(screen.getByTestId('slippage-preset-1')).toHaveTextContent('1%');
		expect(screen.getByTestId('slippage-preset-3')).toHaveTextContent('3%');
		expect(screen.getByTestId('slippage-custom-input')).toBeInTheDocument();
	});

	it('marks the active preset as pressed', () => {
		render(<SlippageSettings value={3} />);

		expect(screen.getByTestId('slippage-preset-3')).toHaveAttribute(
			'aria-pressed',
			'true'
		);
		expect(screen.getByTestId('slippage-preset-1')).toHaveAttribute(
			'aria-pressed',
			'false'
		);
		expect(screen.getByTestId('slippage-preset-0.5')).toHaveAttribute(
			'aria-pressed',
			'false'
		);
	});

	it('selecting a preset updates the tolerance and triggers onChange immediately', () => {
		const onChange = vi.fn();
		render(<SlippageSettings value={1} onChange={onChange} />);

		fireEvent.click(screen.getByTestId('slippage-preset-0.5'));
		expect(onChange).toHaveBeenCalledWith(0.5);

		fireEvent.click(screen.getByTestId('slippage-preset-3'));
		expect(onChange).toHaveBeenCalledWith(3);
	});

	it('selecting a preset updates the displayed minimum received immediately', () => {
		const quote = {
			side: 'sell' as const,
			expectedProceeds: 1000,
			amount: 10,
		};

		const { rerender } = render(<SlippageSettings value={1} quote={quote} />);

		// With 1% slippage on 1000: minReceived = 990
		expect(screen.getByTestId('slippage-min-received')).toHaveTextContent(
			'990'
		);

		// Click 3% preset: minReceived = 970
		rerender(<SlippageSettings value={3} quote={quote} />);
		expect(screen.getByTestId('slippage-min-received')).toHaveTextContent(
			'970'
		);

		// Click 0.5% preset: minReceived = 995
		rerender(<SlippageSettings value={0.5} quote={quote} />);
		expect(screen.getByTestId('slippage-min-received')).toHaveTextContent(
			'995'
		);
	});

	it('rejects negative custom input with inline error and notifies validity change', () => {
		const onValidityChange = vi.fn();
		render(
			<SlippageSettings value={1} onValidityChange={onValidityChange} />
		);

		const input = screen.getByTestId('slippage-custom-input');
		fireEvent.change(input, { target: { value: '-2' } });

		expect(screen.getByTestId('slippage-custom-error')).toHaveTextContent(
			/cannot be negative/i
		);
		expect(onValidityChange).toHaveBeenCalledWith(false);
	});

	it('rejects custom values below 0.01% with inline error', () => {
		const onValidityChange = vi.fn();
		render(
			<SlippageSettings value={1} onValidityChange={onValidityChange} />
		);

		const input = screen.getByTestId('slippage-custom-input');
		fireEvent.change(input, { target: { value: '0.005' } });

		expect(screen.getByTestId('slippage-custom-error')).toHaveTextContent(
			/must be at least 0\.01%/i
		);
		expect(onValidityChange).toHaveBeenCalledWith(false);
	});

	it('rejects custom values above 50% with inline error', () => {
		const onValidityChange = vi.fn();
		render(
			<SlippageSettings value={1} onValidityChange={onValidityChange} />
		);

		const input = screen.getByTestId('slippage-custom-input');
		fireEvent.change(input, { target: { value: '55' } });

		expect(screen.getByTestId('slippage-custom-error')).toHaveTextContent(
			/cannot exceed 50%/i
		);
		expect(onValidityChange).toHaveBeenCalledWith(false);
	});

	it('rejects NaN / invalid string with inline error', () => {
		const onValidityChange = vi.fn();
		render(
			<SlippageSettings value={1} onValidityChange={onValidityChange} />
		);

		const input = screen.getByTestId('slippage-custom-input');
		fireEvent.change(input, { target: { value: 'abc' } });

		expect(screen.getByTestId('slippage-custom-error')).toHaveTextContent(
			/valid/i
		);
		expect(onValidityChange).toHaveBeenCalledWith(false);
	});

	it('accepts valid custom input in 0.01%–50% range and clears errors', () => {
		const onChange = vi.fn();
		const onValidityChange = vi.fn();
		render(
			<SlippageSettings
				value={1}
				onChange={onChange}
				onValidityChange={onValidityChange}
			/>
		);

		const input = screen.getByTestId('slippage-custom-input');
		fireEvent.change(input, { target: { value: '2.5' } });

		expect(
			screen.queryByTestId('slippage-custom-error')
		).not.toBeInTheDocument();
		expect(onChange).toHaveBeenCalledWith(2.5);
		expect(onValidityChange).toHaveBeenCalledWith(true);
	});

	it('displays a warning banner when tolerance exceeds 5%', () => {
		render(<SlippageSettings value={6} />);

		expect(screen.getByTestId('slippage-high-warning')).toBeInTheDocument();
		expect(screen.getByTestId('slippage-warning-text')).toHaveTextContent(
			/high slippage tolerance/i
		);
	});

	it('displays a warning banner when tolerance is below 0.1%', () => {
		render(<SlippageSettings value={0.05} />);

		expect(screen.getByTestId('slippage-low-warning')).toBeInTheDocument();
		expect(screen.getByTestId('slippage-warning-text')).toHaveTextContent(
			/low slippage tolerance/i
		);
	});

	it('does not display warning banners for safe range (0.1% - 5%)', () => {
		render(<SlippageSettings value={1} />);

		expect(
			screen.queryByTestId('slippage-high-warning')
		).not.toBeInTheDocument();
		expect(
			screen.queryByTestId('slippage-low-warning')
		).not.toBeInTheDocument();
	});

	it('clears custom input and inline error when clicking a preset', () => {
		render(<SlippageSettings value={1} />);

		const input = screen.getByTestId('slippage-custom-input');
		fireEvent.change(input, { target: { value: '99' } });
		expect(screen.getByTestId('slippage-custom-error')).toBeInTheDocument();

		// Click preset 1%
		fireEvent.click(screen.getByTestId('slippage-preset-1'));
		expect(
			screen.queryByTestId('slippage-custom-error')
		).not.toBeInTheDocument();
	});
});
