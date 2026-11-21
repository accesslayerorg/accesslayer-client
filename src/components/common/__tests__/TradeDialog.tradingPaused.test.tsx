/**
 * Unit tests for TradeDialog respecting the per-key trading pause (#777).
 *
 * When tradingPaused is true the confirm button must be disabled and the
 * UnavailableAction tooltip must display "Trading is currently paused".
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TradeDialog from '@/components/common/TradeDialog';

describe('TradeDialog – per-key trading pause (#777)', () => {
	function renderDialog(
		overrides: Partial<React.ComponentProps<typeof TradeDialog>> = {}
	) {
		return render(
			<TradeDialog
				open={true}
				side="buy"
				creatorName="Alice"
				availableHoldings={10}
				keyPriceStroops={500_000}
				currentSupply={100}
				onOpenChange={vi.fn()}
				onConfirm={vi.fn()}
				{...overrides}
			/>
		);
	}

	it.each(['buy', 'sell'] as const)(
		'disables the confirm button and shows the pause tooltip on side="%s" when tradingPaused is true',
		(side) => {
			renderDialog({ side, tradingPaused: true });

			const input = screen.getByTestId(
				'trade-dialog-amount'
			) as HTMLInputElement;
			fireEvent.change(input, { target: { value: '1' } });

			// Confirm button must be disabled.
			const confirmButton = screen.getByTestId('trade-dialog-confirm');
			expect(confirmButton).toBeDisabled();

			// The UnavailableAction tooltip must contain the pause reason.
			const tooltips = screen.getAllByRole('tooltip');
			const pauseTooltip = tooltips.find((t) =>
				t.textContent?.includes('Trading is currently paused')
			);
			expect(pauseTooltip).toBeDefined();
		}
	);

	it('does not show the pause tooltip on side="sell" when tradingPaused is false', () => {
		renderDialog({ side: 'sell', tradingPaused: false });

		expect(
			screen.queryByText('Trading is currently paused')
		).not.toBeInTheDocument();
	});
});
