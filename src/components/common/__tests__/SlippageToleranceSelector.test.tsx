import { describe, expect, it, vi } from 'vitest';
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
