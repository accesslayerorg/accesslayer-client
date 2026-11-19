import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TradeDialog from '@/components/common/TradeDialog';
import { computeMaxBuyWithinSlippage } from '@/utils/liquidityDepth.utils';

/** A supply where 1% slippage allows a handful of keys but 2% allows more. */
function findSupply(): { supply: number; maxAt1: number; maxAt2: number } {
	for (let supply = 100; supply < 1_000_000; supply += 100) {
		const maxAt1 = computeMaxBuyWithinSlippage({
			currentSupply: supply,
			slippageTolerancePercent: 1,
		});
		const maxAt2 = computeMaxBuyWithinSlippage({
			currentSupply: supply,
			slippageTolerancePercent: 2,
		});
		if (maxAt1 >= 5 && maxAt1 <= 40 && maxAt2 > maxAt1 + 2) {
			return { supply, maxAt1, maxAt2 };
		}
	}
	throw new Error('no suitable supply found for the default curve');
}

describe('TradeDialog liquidity depth indicator (#1108)', () => {
	const { supply, maxAt1, maxAt2 } = findSupply();

	beforeEach(() => {
		window.localStorage.clear();
	});

	function renderBuy() {
		const onConfirm = vi.fn();
		render(
			<TradeDialog
				open={true}
				side="buy"
				creatorName="Alice"
				availableHoldings={0}
				keyPriceStroops={1_000_000}
				currentSupply={supply}
				protocolFeeBps={0}
				creatorFeeBps={0}
				onOpenChange={vi.fn()}
				onConfirm={onConfirm}
			/>
		);
		return { onConfirm };
	}

	function setAmount(value: string) {
		fireEvent.change(screen.getByTestId('trade-dialog-amount'), {
			target: { value },
		});
	}

	it('shows the max buy for the current slippage under the amount input', () => {
		renderBuy();
		expect(screen.getByTestId('liquidity-depth-max')).toHaveTextContent(
			`Max buy at 1% slippage: ${maxAt1} key`
		);
	});

	it('updates when the slippage tolerance changes', () => {
		renderBuy();
		fireEvent.click(screen.getByTestId('slippage-preset-2'));
		expect(screen.getByTestId('liquidity-depth-max')).toHaveTextContent(
			`Max buy at 2% slippage: ${maxAt2} key`
		);
	});

	it('shows no warning for small amounts', () => {
		renderBuy();
		setAmount('1');
		expect(screen.queryByTestId('liquidity-depth-warning')).toBeNull();
	});

	it('warns when the amount approaches the limit but keeps Buy enabled', () => {
		renderBuy();
		setAmount(String(maxAt1));
		const warning = screen.getByTestId('liquidity-depth-warning');
		expect(warning).toHaveAttribute('data-status', 'approaching');
		expect(screen.getByTestId('trade-dialog-confirm')).not.toBeDisabled();
	});

	it('disables Buy and shows an alert when the amount exceeds the depth', () => {
		const { onConfirm } = renderBuy();
		setAmount(String(maxAt1 + 1));
		const warning = screen.getByTestId('liquidity-depth-warning');
		expect(warning).toHaveAttribute('data-status', 'exceeded');
		expect(warning).toHaveAttribute('role', 'alert');
		const confirm = screen.getByTestId('trade-dialog-confirm');
		expect(confirm).toBeDisabled();
		fireEvent.click(confirm);
		expect(onConfirm).not.toHaveBeenCalled();
	});

	it('re-enables Buy after raising the slippage tolerance', () => {
		renderBuy();
		setAmount(String(maxAt1 + 1));
		expect(screen.getByTestId('trade-dialog-confirm')).toBeDisabled();
		fireEvent.click(screen.getByTestId('slippage-preset-2'));
		expect(screen.getByTestId('trade-dialog-confirm')).not.toBeDisabled();
	});

	it('exposes an accessible tooltip explaining liquidity depth', () => {
		renderBuy();
		const trigger = screen.getByRole('button', {
			name: /what is liquidity depth/i,
		});
		fireEvent.focus(trigger);
		expect(screen.getByRole('tooltip')).toHaveTextContent(
			/slippage tolerance/i
		);
	});

	it('is not shown on the sell side', () => {
		render(
			<TradeDialog
				open={true}
				side="sell"
				creatorName="Alice"
				availableHoldings={10}
				keyPriceStroops={1_000_000}
				currentSupply={supply}
				onOpenChange={vi.fn()}
				onConfirm={vi.fn()}
			/>
		);
		expect(screen.queryByTestId('liquidity-depth')).toBeNull();
	});
});
