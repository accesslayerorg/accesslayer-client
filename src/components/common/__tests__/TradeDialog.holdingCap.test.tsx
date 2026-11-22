import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TradeDialog from '../TradeDialog';

describe('TradeDialog holding cap warning and enforcement (#1015)', () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	function renderBuyDialog(
		overrides: Partial<React.ComponentProps<typeof TradeDialog>> = {}
	) {
		return render(
			<TradeDialog
				open={true}
				side="buy"
				creatorName="Alex Rivers"
				availableHoldings={5}
				keyPriceStroops={1_000_000}
				currentSupply={100}
				holdingCap={20}
				onOpenChange={vi.fn()}
				onConfirm={vi.fn()}
				{...overrides}
			/>
		);
	}

	it('renders holding cap progress bar and ratio on the buy form', () => {
		renderBuyDialog({ availableHoldings: 5, holdingCap: 20 });

		expect(screen.getByTestId('holding-cap-indicator')).toBeInTheDocument();
		expect(screen.getByTestId('holding-cap-ratio')).toHaveTextContent('5 / 20 keys');

		const progressBar = screen.getByTestId('holding-cap-progress-bar');
		expect(progressBar).toHaveAttribute('aria-valuenow', '5');
		expect(progressBar).toHaveAttribute('aria-valuemax', '20');
		expect(progressBar).toHaveAttribute('aria-valuetext', '5 of 20 keys (25%)');
	});

	it('does not render cap indicator when holdingCap is not set (unlimited)', () => {
		renderBuyDialog({ holdingCap: null });

		expect(screen.queryByTestId('holding-cap-indicator')).not.toBeInTheDocument();
		expect(screen.queryByTestId('holding-cap-progress-bar')).not.toBeInTheDocument();
	});

	it('does not render cap indicator on the sell side even if holdingCap is set', () => {
		render(
			<TradeDialog
				open={true}
				side="sell"
				creatorName="Alex Rivers"
				availableHoldings={5}
				holdingCap={20}
				onOpenChange={vi.fn()}
				onConfirm={vi.fn()}
			/>
		);

		expect(screen.queryByTestId('holding-cap-indicator')).not.toBeInTheDocument();
	});

	it('displays inline warning as amount input changes to exceed cap', () => {
		renderBuyDialog({ availableHoldings: 15, holdingCap: 20 });

		const input = screen.getByTestId('trade-dialog-amount') as HTMLInputElement;

		// Initial amount is 1 -> total 16 <= 20: no warning
		expect(screen.queryByTestId('holding-cap-warning')).not.toBeInTheDocument();

		// Change amount to 6 -> total 21 > 20: warning appears inline
		fireEvent.change(input, { target: { value: '6' } });
		const warning = screen.getByTestId('holding-cap-warning');
		expect(warning).toBeInTheDocument();
		expect(warning).toHaveTextContent(/would exceed the holding cap of 20 keys/i);

		// Change amount back to 5 -> total 20 <= 20: warning disappears
		fireEvent.change(input, { target: { value: '5' } });
		expect(screen.queryByTestId('holding-cap-warning')).not.toBeInTheDocument();
	});

	it('disables the buy button with cap exceeded message when purchase would exceed cap', () => {
		renderBuyDialog({ availableHoldings: 15, holdingCap: 20 });

		const input = screen.getByTestId('trade-dialog-amount') as HTMLInputElement;
		const confirmButton = screen.getByTestId('trade-dialog-confirm');

		// Enter amount 10 (15 + 10 = 25 > 20)
		fireEvent.change(input, { target: { value: '10' } });

		expect(confirmButton).toBeDisabled();
		expect(confirmButton).toHaveTextContent('Holding Cap Exceeded');
	});

	it('disables the buy button with limit reached message when user is already at the cap', () => {
		renderBuyDialog({ availableHoldings: 20, holdingCap: 20 });

		const confirmButton = screen.getByTestId('trade-dialog-confirm');
		expect(confirmButton).toBeDisabled();
		expect(confirmButton).toHaveTextContent('Holding Cap Reached');

		const warning = screen.getByTestId('holding-cap-warning');
		expect(warning).toHaveTextContent(/reached the maximum holding cap of 20 keys/i);
	});

	it('displays tooltip explaining the creator holding cap policy accurately', () => {
		renderBuyDialog({ availableHoldings: 5, holdingCap: 20, creatorName: 'Alex Rivers' });

		const infoTrigger = screen.getByRole('button', { name: /holding cap policy/i });
		expect(infoTrigger).toBeInTheDocument();

		fireEvent.mouseEnter(infoTrigger);

		const tooltip = screen.getByRole('tooltip');
		expect(tooltip).toBeInTheDocument();
		expect(tooltip).toHaveTextContent(
			'Alex Rivers has set a maximum holding cap of 20 keys per wallet to prevent concentration and encourage wide distribution.'
		);
	});

	it('clamps MAX button to remaining holding cap allowance', () => {
		renderBuyDialog({ availableHoldings: 14, holdingCap: 20 });

		const maxButton = screen.getByTestId('trade-dialog-max-button');
		const input = screen.getByTestId('trade-dialog-amount') as HTMLInputElement;

		fireEvent.click(maxButton);

		// 20 cap - 14 held = 6 keys remaining
		expect(input.value).toBe('6');
		expect(screen.queryByTestId('holding-cap-warning')).not.toBeInTheDocument();
	});

	it('disables MAX button on buy side when holding cap is already reached', () => {
		renderBuyDialog({ availableHoldings: 20, holdingCap: 20 });

		const maxButton = screen.getByTestId('trade-dialog-max-button');
		expect(maxButton).toBeDisabled();
	});

	it('blocks onConfirm execution when cap would be exceeded', () => {
		const onConfirm = vi.fn();
		renderBuyDialog({ availableHoldings: 18, holdingCap: 20, onConfirm });

		const input = screen.getByTestId('trade-dialog-amount') as HTMLInputElement;
		const confirmButton = screen.getByTestId('trade-dialog-confirm');

		fireEvent.change(input, { target: { value: '5' } });
		fireEvent.click(confirmButton);

		expect(onConfirm).not.toHaveBeenCalled();
	});
});
