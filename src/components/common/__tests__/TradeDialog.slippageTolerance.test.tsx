import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TradeDialog from '@/components/common/TradeDialog';

describe('TradeDialog slippage tolerance (#872)', () => {
	function renderBuyDialog(
		overrides: Partial<React.ComponentProps<typeof TradeDialog>> = {}
	) {
		const onConfirm = vi.fn();
		render(
			<TradeDialog
				open={true}
				side="buy"
				creatorName="Alice"
				availableHoldings={10}
				keyPriceStroops={1_000_000}
				protocolFeeBps={0}
				creatorFeeBps={0}
				onOpenChange={vi.fn()}
				onConfirm={onConfirm}
				{...overrides}
			/>
		);
		return { onConfirm };
	}

	function renderSellDialog(
		overrides: Partial<React.ComponentProps<typeof TradeDialog>> = {}
	) {
		const onConfirm = vi.fn();
		render(
			<TradeDialog
				open={true}
				side="sell"
				creatorName="Alice"
				availableHoldings={10}
				keyPriceStroops={1_000_000}
				currentSupply={100}
				onOpenChange={vi.fn()}
				onConfirm={onConfirm}
				{...overrides}
			/>
		);
		return { onConfirm };
	}

	it('renders the slippage selector on the buy dialog', () => {
		renderBuyDialog();
		expect(screen.getByTestId('slippage-tolerance-selector')).toBeInTheDocument();
	});

	it('renders the slippage selector on the sell dialog', () => {
		renderSellDialog();
		expect(screen.getByTestId('slippage-tolerance-selector')).toBeInTheDocument();
	});

	it('defaults to 1% tolerance', () => {
		renderBuyDialog();
		expect(screen.getByTestId('slippage-tolerance-current-value')).toHaveTextContent(
			'1%'
		);
	});

	it('passes maxPriceStroops computed from the default 1% tolerance on buy confirm', () => {
		const { onConfirm } = renderBuyDialog();

		fireEvent.click(screen.getByTestId('trade-dialog-confirm'));

		expect(onConfirm).toHaveBeenCalled();
		const [, , slippage] = onConfirm.mock.calls[0];
		// Estimated total for qty 1 @ 1_000_000 stroops, no fees = 1_000_000.
		// max = 1_000_000 * 1.01 = 1_010_000.
		expect(slippage.maxPriceStroops).toBe(1_010_000);
		expect(slippage.minPriceStroops).toBeNull();
	});

	it('recomputes maxPriceStroops when a different preset is selected', () => {
		const { onConfirm } = renderBuyDialog();

		fireEvent.click(screen.getByTestId('slippage-preset-5'));
		fireEvent.click(screen.getByTestId('trade-dialog-confirm'));

		const [, , slippage] = onConfirm.mock.calls[0];
		expect(slippage.maxPriceStroops).toBe(1_050_000);
		expect(slippage.toleranceZPercent).toBe(5);
	});

	it('passes minPriceStroops computed from tolerance on sell confirm', () => {
		const { onConfirm } = renderSellDialog();

		fireEvent.click(screen.getByTestId('trade-dialog-confirm'));

		const [, , slippage] = onConfirm.mock.calls[0];
		// estimateSellProceeds(1_000_000, 100, 1) = 1_000_000
		// min = 1_000_000 * 0.99 = 990_000
		expect(slippage.minPriceStroops).toBe(990_000);
		expect(slippage.maxPriceStroops).toBeNull();
	});

	it('recomputes minPriceStroops when a custom tolerance is entered', () => {
		const { onConfirm } = renderSellDialog();

		fireEvent.change(screen.getByTestId('slippage-custom-input'), {
			target: { value: '10' },
		});
		fireEvent.click(screen.getByTestId('trade-dialog-confirm'));

		const [, , slippage] = onConfirm.mock.calls[0];
		expect(slippage.minPriceStroops).toBe(900_000);
	});
});
