/**
 * Unit tests for TradeDialog respecting the key freeze status (#1121).
 *
 * While a freeze is active the amount input, MAX button, and confirm button
 * must be disabled, an orange freeze alert must surface the reason and
 * expiry, and the UnavailableAction tooltip must show the freeze reason
 * (taking precedence over a trading pause).
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TradeDialog from '@/components/common/TradeDialog';
import type { KeyFreezeStatus } from '@/hooks/useKeyFreeze';

const FREEZE_REASON = 'Under review for suspicious trading activity';

const FROZEN: KeyFreezeStatus = {
	reason: FREEZE_REASON,
	expiresAt: '2026-12-01T00:00:00.000Z',
	expiresAtMs: Date.parse('2026-12-01T00:00:00.000Z'),
};

const INDEFINITE: KeyFreezeStatus = {
	reason: FREEZE_REASON,
	expiresAt: null,
	expiresAtMs: null,
};

describe('TradeDialog – key freeze (#1121)', () => {
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
				currentSupply={10_000}
				onOpenChange={vi.fn()}
				onConfirm={vi.fn()}
				{...overrides}
			/>
		);
	}

	it.each(['buy', 'sell'] as const)(
		'disables input, MAX, and confirm and shows the freeze tooltip on side="%s"',
		side => {
			renderDialog({ side, keyFreeze: FROZEN });

			const input = screen.getByTestId(
				'trade-dialog-amount'
			) as HTMLInputElement;
			expect(input).toBeDisabled();
			expect(screen.getByTestId('trade-dialog-max-button')).toBeDisabled();
			expect(screen.getByTestId('trade-dialog-confirm')).toBeDisabled();

			// The UnavailableAction tooltip must contain the freeze reason.
			const tooltips = screen.getAllByRole('tooltip');
			const freezeTooltip = tooltips.find(t =>
				t.textContent?.includes(FREEZE_REASON)
			);
			expect(freezeTooltip).toBeDefined();
		}
	);

	it('shows the orange freeze alert with the reason and expiry', () => {
		renderDialog({ keyFreeze: FROZEN });

		const alert = screen.getByTestId('trade-dialog-freeze-alert');
		expect(alert).toHaveAttribute('role', 'alert');
		const reason = screen.getByTestId('trade-dialog-freeze-reason');
		expect(reason).toHaveTextContent(FREEZE_REASON);
		expect(reason).toHaveTextContent('Freeze lifts on');
	});

	it('states that the freeze is indefinite when no expiry is set', () => {
		renderDialog({ keyFreeze: INDEFINITE });

		expect(screen.getByTestId('trade-dialog-freeze-reason')).toHaveTextContent(
			'The freeze is indefinite.'
		);
	});

	it('prefers the freeze reason over the pause tooltip when both apply', () => {
		renderDialog({ keyFreeze: FROZEN, tradingPaused: true });

		const tooltips = screen.getAllByRole('tooltip');
		const freezeTooltip = tooltips.find(t =>
			t.textContent?.includes(FREEZE_REASON)
		);
		expect(freezeTooltip).toBeDefined();
		const pauseTooltip = tooltips.find(t =>
			t.textContent?.includes('Trading is currently paused')
		);
		expect(pauseTooltip).toBeUndefined();
	});

	it('leaves trading enabled when no freeze is set', () => {
		renderDialog();

		expect(
			screen.queryByTestId('trade-dialog-freeze-alert')
		).not.toBeInTheDocument();
		expect(screen.getByTestId('trade-dialog-confirm')).not.toBeDisabled();
	});
});
