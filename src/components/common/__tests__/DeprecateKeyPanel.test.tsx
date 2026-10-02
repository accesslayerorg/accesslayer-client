import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DeprecateKeyPanel from '../DeprecateKeyPanel';

describe('DeprecateKeyPanel', () => {
	it('computes total escrow amount correctly as buybackPrice * circulatingSupply', () => {
		render(
			<DeprecateKeyPanel
				creatorId="creator-1"
				circulatingSupply={100}
				onSubmit={vi.fn()}
			/>
		);

		// Default buyback price input is 1, supply is 100 => total escrow = 100 XLM
		const escrowDisplay = screen.getByTestId('total-escrow-amount');
		expect(escrowDisplay).toHaveTextContent('100.00 XLM');

		// Change buyback price to 2.5
		const priceInput = screen.getByTestId('buyback-price-input');
		fireEvent.change(priceInput, { target: { value: '2.5' } });

		// 2.5 * 100 = 250 XLM
		expect(screen.getByTestId('total-escrow-amount')).toHaveTextContent(
			'250.00 XLM'
		);
	});

	it('disables submit until "DEPRECATE" is typed in the confirmation input', () => {
		const handleSubmit = vi.fn();
		render(
			<DeprecateKeyPanel
				creatorId="creator-1"
				circulatingSupply={100}
				onSubmit={handleSubmit}
			/>
		);

		const submitBtn = screen.getByTestId('deprecate-key-submit');
		const confirmInput = screen.getByTestId('deprecate-confirm-input');

		// Initially submit is disabled
		expect(submitBtn).toBeDisabled();

		// Typing incorrect string leaves submit disabled
		fireEvent.change(confirmInput, { target: { value: 'deprecate' } });
		expect(submitBtn).toBeDisabled();

		// Typing exact "DEPRECATE" enables submit
		fireEvent.change(confirmInput, { target: { value: 'DEPRECATE' } });
		expect(submitBtn).toBeEnabled();

		fireEvent.click(submitBtn);
		expect(handleSubmit).toHaveBeenCalledWith({
			buybackPrice: 1,
			totalEscrow: 100,
		});
	});

	it('shows error when creator balance is insufficient for escrow and disables submit', () => {
		render(
			<DeprecateKeyPanel
				creatorId="creator-1"
				circulatingSupply={100}
				creatorBalanceXlm={50} // 50 XLM available < 100 XLM required
				onSubmit={vi.fn()}
			/>
		);

		expect(
			screen.getByTestId('insufficient-balance-error')
		).toBeInTheDocument();
		expect(
			screen.getByTestId('insufficient-balance-error')
		).toHaveTextContent(
			'Insufficient creator balance for escrow. Required: 100.00 XLM, Available: 50.00 XLM'
		);

		// Confirm submit stays disabled even if DEPRECATE is typed
		const confirmInput = screen.getByTestId('deprecate-confirm-input');
		fireEvent.change(confirmInput, { target: { value: 'DEPRECATE' } });
		expect(screen.getByTestId('deprecate-key-submit')).toBeDisabled();
	});

	it('shows "Key deprecated" banner when isDeprecated is true', () => {
		render(
			<DeprecateKeyPanel
				creatorId="creator-1"
				circulatingSupply={100}
				isDeprecated={true}
				onSubmit={vi.fn()}
			/>
		);

		const banner = screen.getByTestId('key-deprecated-banner');
		expect(banner).toBeInTheDocument();
		expect(banner).toHaveTextContent('Key deprecated');
		expect(
			screen.queryByTestId('deprecate-key-submit')
		).not.toBeInTheDocument();
	});
});
