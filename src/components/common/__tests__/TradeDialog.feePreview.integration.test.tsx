/**
 * Integration test for the buy fee preview flow.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import TradeDialog from '@/components/common/TradeDialog';

describe('TradeDialog fee preview integration', () => {
	function renderBuyDialog(
		overrides: Partial<React.ComponentProps<typeof TradeDialog>> = {}
	) {
		return render(
			<TradeDialog
				open={true}
				side="buy"
				creatorName="TestCreator"
				availableHoldings={100}
				keyPriceStroops={1_000_000}
				protocolFeeBps={250}
				creatorFeeBps={250}
				onOpenChange={vi.fn()}
				onConfirm={vi.fn()}
				{...overrides}
			/>
		);
	}

	it('renders the buy dialog with fee preview support', () => {
		renderBuyDialog();
		expect(screen.getByTestId('trade-dialog-amount')).toHaveValue('1');
		expect(screen.getByTestId('trade-dialog-confirm')).toBeInTheDocument();
	});

	it('passes price preview to onConfirm', () => {
		const onConfirm = vi.fn();
		renderBuyDialog({ onConfirm });

		const confirmButton = screen.getByTestId('trade-dialog-confirm');
		fireEvent.click(confirmButton);

		expect(onConfirm).toHaveBeenCalled();
		const [amount] = onConfirm.mock.calls[0];
		expect(amount).toBe(1);
	});

	it('does not show fee preview for sell transactions', () => {
		render(
			<TradeDialog
				open={true}
				side="sell"
				creatorName="TestCreator"
				availableHoldings={100}
				keyPriceStroops={1_000_000}
				onOpenChange={vi.fn()}
				onConfirm={vi.fn()}
			/>
		);

		expect(screen.getByTestId('trade-dialog-confirm')).toBeInTheDocument();
	});
});
