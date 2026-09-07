import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SlippageToleranceSelector from '@/components/common/SlippageToleranceSelector';

describe('SlippageToleranceSelector', () => {
	function renderSelector(
		overrides: Partial<
			React.ComponentProps<typeof SlippageToleranceSelector>
		> = {}
	) {
		const onChange = vi.fn();
		const utils = render(
			<SlippageToleranceSelector
				value={1}
				onChange={onChange}
				{...overrides}
			/>
		);
		return { onChange, ...utils };
	}

	it('renders the 0.5% / 1% / 5% presets', () => {
		renderSelector();
		expect(screen.getByTestId('slippage-preset-0.5')).toBeInTheDocument();
		expect(screen.getByTestId('slippage-preset-1')).toBeInTheDocument();
		expect(screen.getByTestId('slippage-preset-5')).toBeInTheDocument();
	});

	it('marks the currently selected preset as pressed', () => {
		renderSelector({ value: 5 });
		expect(screen.getByTestId('slippage-preset-5')).toHaveAttribute(
			'aria-pressed',
			'true'
		);
		expect(screen.getByTestId('slippage-preset-1')).toHaveAttribute(
			'aria-pressed',
			'false'
		);
	});

	it('calls onChange with the preset value when clicked', () => {
		const { onChange } = renderSelector({ value: 1 });
		fireEvent.click(screen.getByTestId('slippage-preset-5'));
		expect(onChange).toHaveBeenCalledWith(5);
	});

	it('displays the currently selected value', () => {
		renderSelector({ value: 0.5 });
		expect(
			screen.getByTestId('slippage-tolerance-current-value')
		).toHaveTextContent('0.5%');
	});

	it('calls onChange with a valid custom value', () => {
		const { onChange } = renderSelector();
		const input = screen.getByTestId('slippage-custom-input');
		fireEvent.change(input, { target: { value: '2.5' } });
		expect(onChange).toHaveBeenCalledWith(2.5);
	});

	it('shows a validation error for a negative custom value and does not call onChange', () => {
		const { onChange } = renderSelector();
		const input = screen.getByTestId('slippage-custom-input');
		fireEvent.change(input, { target: { value: '-1' } });
		expect(screen.getByTestId('slippage-custom-error')).toHaveTextContent(
			/cannot be negative/i
		);
		expect(onChange).not.toHaveBeenCalled();
	});

	it('shows a validation error for a custom value above 50 and does not call onChange', () => {
		const { onChange } = renderSelector();
		const input = screen.getByTestId('slippage-custom-input');
		fireEvent.change(input, { target: { value: '75' } });
		expect(screen.getByTestId('slippage-custom-error')).toHaveTextContent(
			/cannot exceed 50%/i
		);
		expect(onChange).not.toHaveBeenCalled();
	});

	it('disables presets and custom input when disabled', () => {
		renderSelector({ disabled: true });
		expect(screen.getByTestId('slippage-preset-1')).toBeDisabled();
		expect(screen.getByTestId('slippage-custom-input')).toBeDisabled();
	});

	it('clears custom input state when a preset is clicked after typing a custom value', () => {
		renderSelector();
		const input = screen.getByTestId(
			'slippage-custom-input'
		) as HTMLInputElement;
		fireEvent.change(input, { target: { value: '3' } });
		fireEvent.click(screen.getByTestId('slippage-preset-0.5'));
		expect(input).toHaveValue('');
	});
});
