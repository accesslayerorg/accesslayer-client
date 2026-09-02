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
			<SlippageToleranceSelector value={1} onChange={onChange} {...overrides} />
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
		expect(screen.getByTestId('slippage-tolerance-current-value')).toHaveTextContent(
			'0.5%'
		);
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
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import SlippageToleranceSelector from '@/components/common/SlippageToleranceSelector';

describe('SlippageToleranceSelector (#877)', () => {
	it('shows max_price of 100.5 XLM for the 0.5% preset on a 100 XLM buy preview', () => {
		render(<SlippageToleranceSelector previewPrice={100} side="buy" />);

		// 0.5% is the default-selected preset.
		expect(screen.getByTestId('slippage-price-bound')).toHaveTextContent(
			'Max price: 100.5 XLM'
		);
	});

	it('shows max_price of 105 XLM after selecting the 5% preset', async () => {
		const user = userEvent.setup();
		render(<SlippageToleranceSelector previewPrice={100} side="buy" />);

		await user.click(screen.getByTestId('slippage-preset-5'));

		expect(screen.getByTestId('slippage-price-bound')).toHaveTextContent(
			'Max price: 105 XLM'
		);
	});

	it('shows min_price of 99 XLM after selecting the 1% preset on a sell', async () => {
		const user = userEvent.setup();
		render(<SlippageToleranceSelector previewPrice={100} side="sell" />);

		await user.click(screen.getByTestId('slippage-preset-1'));

		expect(screen.getByTestId('slippage-price-bound')).toHaveTextContent(
			'Min price: 99 XLM'
		);
	});

	it('sets max_price equal to the preview price for a custom 0% tolerance', async () => {
		const user = userEvent.setup();
		render(<SlippageToleranceSelector previewPrice={100} side="buy" />);

		await user.type(screen.getByTestId('slippage-custom-input'), '0');

		expect(screen.getByTestId('slippage-price-bound')).toHaveTextContent(
			'Max price: 100 XLM'
		);
		expect(
			screen.queryByTestId('slippage-validation-error')
		).not.toBeInTheDocument();
		expect(screen.getByTestId('slippage-confirm-button')).toBeEnabled();
	});

	it('shows a validation error and disables the confirm button for a custom tolerance above 50%', async () => {
		const user = userEvent.setup();
		const onValidityChange = vi.fn();
		render(
			<SlippageToleranceSelector
				previewPrice={100}
				side="buy"
				onValidityChange={onValidityChange}
			/>
		);

		await user.type(screen.getByTestId('slippage-custom-input'), '51');

		expect(screen.getByTestId('slippage-validation-error')).toHaveTextContent(
			/50%/
		);
		expect(screen.getByTestId('slippage-confirm-button')).toBeDisabled();
		expect(onValidityChange).toHaveBeenLastCalledWith(false);
		// No stale price-bound should be shown once the input is invalid.
		expect(
			screen.queryByTestId('slippage-price-bound')
		).not.toBeInTheDocument();
	});

	it('re-enables the confirm button once a custom tolerance is corrected back into range', async () => {
		const user = userEvent.setup();
		render(<SlippageToleranceSelector previewPrice={100} side="buy" />);

		const input = screen.getByTestId('slippage-custom-input');
		await user.type(input, '75');
		expect(screen.getByTestId('slippage-confirm-button')).toBeDisabled();

		await user.clear(input);
		await user.type(input, '10');
		expect(screen.getByTestId('slippage-confirm-button')).toBeEnabled();
	});

	it('calls onConfirm with the computed bounds when the confirm button is clicked', async () => {
		const user = userEvent.setup();
		const onConfirm = vi.fn();
		render(
			<SlippageToleranceSelector
				previewPrice={100}
				side="buy"
				onConfirm={onConfirm}
			/>
		);

		await user.click(screen.getByTestId('slippage-confirm-button'));

		expect(onConfirm).toHaveBeenCalledWith({
			maxPrice: 100.5,
			minPrice: null,
		});
	});
});
