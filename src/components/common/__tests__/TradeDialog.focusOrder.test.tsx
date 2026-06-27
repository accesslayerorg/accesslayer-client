import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TradeDialog from '@/components/common/TradeDialog';

/**
 * The dialog's focus order is part of its accessibility contract — keyboard
 * users wrap through `Close → amount input → Cancel → Confirm`, matching
 * the visual top-to-bottom and left-to-right order. These tests guard
 * against future refactors that accidentally swap these elements in the
 * DOM (which would also swap them in the tab sequence) or remove markers.
 */
describe('TradeDialog focus order', () => {
	function renderDialog(
		overrides: Partial<React.ComponentProps<typeof TradeDialog>> = {}
	) {
		return render(
			<TradeDialog
				open={true}
				side="buy"
				creatorName="Alice"
				availableHoldings={10}
				onOpenChange={vi.fn()}
				onConfirm={vi.fn()}
				{...overrides}
			/>
		);
	}

	it('renders the focus-order markers on the primary controls', () => {
		renderDialog();

		expect(screen.getByTestId('trade-dialog-amount')).toHaveAttribute(
			'data-focus-order',
			'1'
		);
		expect(screen.getByTestId('trade-dialog-cancel')).toHaveAttribute(
			'data-focus-order',
			'2'
		);
		expect(screen.getByTestId('trade-dialog-confirm')).toHaveAttribute(
			'data-focus-order',
			'3'
		);
	});

	it('orders the controls in DOM as Close → amount → Cancel → Confirm so tab sequence matches', () => {
		renderDialog();

		const elements = Array.from(
			document.querySelectorAll(
				'[data-slot="dialog-close"], [data-focus-order]'
			)
		).map(el => ({
			identifier:
				el.getAttribute('data-testid') || el.getAttribute('data-slot'),
			order: el.getAttribute('data-focus-order') || '0',
		}));

		expect(elements).toEqual([
			{ identifier: 'dialog-close', order: '0' },
			{ identifier: 'trade-dialog-amount', order: '1' },
			{ identifier: 'trade-dialog-cancel', order: '2' },
			{ identifier: 'trade-dialog-confirm', order: '3' },
		]);
	});

	it('keeps the primary action reachable (not removed from the tab sequence)', () => {
		renderDialog();

		const confirm = screen.getByTestId('trade-dialog-confirm');
		// A button with no explicit tabindex is in the tab sequence as long as
		// it isn't disabled. This regression-tests that we never accidentally
		// add `tabIndex={-1}` to the primary action.
		expect(confirm.getAttribute('tabindex')).not.toBe('-1');
	});

	it('keeps Cancel reachable so users can always back out via the keyboard', () => {
		renderDialog();

		const cancel = screen.getByTestId('trade-dialog-cancel');
		expect(cancel.getAttribute('tabindex')).not.toBe('-1');
	});

	it('reserves the confirm button width while showing the submitting state', () => {
		renderDialog({ isSubmitting: true });

		const confirm = screen.getByTestId('trade-dialog-confirm');

		expect(confirm).toHaveAttribute('aria-busy', 'true');
		expect(screen.getByText('Confirm buy')).toHaveClass('invisible');
		expect(screen.getByText('Submitting…')).toBeVisible();
		expect(confirm.querySelector('.animate-spin')).toBeInTheDocument();
	});

	it('preserves the same focus order in the sell variant', () => {
		renderDialog({ side: 'sell' });

		const ordered = Array.from(
			document.querySelectorAll('[data-focus-order]')
		).map(el => el.getAttribute('data-focus-order'));

		expect(ordered).toEqual(['1', '2', '3']);
	});

	it('shows an approximate network fee estimate before confirmation', async () => {
		renderDialog({
			networkFeeEstimateProvider: {
				getFeeData: vi.fn().mockResolvedValue({
					gasPrice: 1_000_000_000n,
				}),
			},
		});

		expect(screen.getByTestId('trade-dialog-confirm')).toBeInTheDocument();
		expect(
			await screen.findByText('Approx. network fee: ~0.00018 ETH')
		).toBeInTheDocument();
	});

	it('shows a cannot estimate message when the fee estimate fails', async () => {
		renderDialog({
			networkFeeEstimateProvider: {
				getFeeData: vi.fn().mockRejectedValue(new Error('RPC unavailable')),
			},
		});

		expect(
			await screen.findByText(
				'Approx. network fee: Cannot estimate network fee'
			)
		).toBeInTheDocument();
	});
});
