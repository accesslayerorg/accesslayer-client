import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TradeDialog from '@/components/common/TradeDialog';

/**
 * The dialog's focus order is part of its accessibility contract — keyboard
 * users tab through `amount input → Cancel → Confirm`, matching the
 * left-to-right visual order. These tests guard against future refactors
 * that accidentally swap Cancel and Confirm in the DOM (which would also
 * swap them in the tab sequence) or remove the marker attributes.
 */
describe('TradeDialog focus order', () => {
	function renderDialog(overrides: Partial<React.ComponentProps<typeof TradeDialog>> = {}) {
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

	it('renders the focus-order markers on the three primary controls', () => {
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

	it('orders the controls in DOM as amount → Cancel → Confirm so tab sequence matches', () => {
		renderDialog();

		const ordered = Array.from(
			document.querySelectorAll('[data-focus-order]')
		).map(el => ({
			testId: el.getAttribute('data-testid'),
			order: el.getAttribute('data-focus-order'),
		}));

		expect(ordered).toEqual([
			{ testId: 'trade-dialog-amount', order: '1' },
			{ testId: 'trade-dialog-cancel', order: '2' },
			{ testId: 'trade-dialog-confirm', order: '3' },
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

	it('preserves the same focus order in the sell variant', () => {
		renderDialog({ side: 'sell' });

		const ordered = Array.from(
			document.querySelectorAll('[data-focus-order]')
		).map(el => el.getAttribute('data-focus-order'));

		expect(ordered).toEqual(['1', '2', '3']);
	});
});
