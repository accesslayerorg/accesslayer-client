import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import TradeDialog from '@/components/common/TradeDialog';

/**
 * Keyboard accessibility for the buy (#700) and sell (#722) key modals.
 * TradeDialog is built on Radix's Dialog primitive, which natively provides
 * focus trapping, Escape-to-close, and focus-return-to-trigger-on-close.
 * These tests verify that contract holds for THIS dialog's actual controls
 * (amount input, Cancel, Confirm) rather than assuming the primitive is
 * wired correctly, since `onOpenAutoFocus`/`onEscapeKeyDown` overrides in
 * TradeDialog.tsx could silently break any of these if changed carelessly.
 *
 * The modal is shared between the buy and sell flows (LandingPage.tsx opens
 * it with `openTradeDialog('buy' | 'sell')`), so both variants are guarded
 * here.
 */
describe('TradeDialog keyboard accessibility', () => {
	/**
	 * Renders a real trigger button + TradeDialog together (mirroring how
	 * LandingPage.tsx wires them: a button's onClick opens the dialog), so
	 * focus-return-to-trigger can be verified against the actual element
	 * that had focus when the dialog opened, not a synthetic stand-in.
	 */
	function DialogWithTrigger(
		overrides: Partial<React.ComponentProps<typeof TradeDialog>> = {}
	) {
		const [open, setOpen] = useState(false);
		const side = overrides.side ?? 'buy';
		return (
			<>
				<button type="button" onClick={() => setOpen(true)}>
					{`Open ${side} dialog`}
				</button>
				<TradeDialog
					open={open}
					side={side}
					creatorName="Alice"
					availableHoldings={10}
					onOpenChange={setOpen}
					onConfirm={vi.fn()}
					{...overrides}
				/>
			</>
		);
	}

	it('sets initial focus on the quantity input when the modal opens', async () => {
		const user = userEvent.setup();
		render(<DialogWithTrigger />);

		await user.click(screen.getByRole('button', { name: 'Open buy dialog' }));

		await waitFor(() => {
			expect(screen.getByTestId('trade-dialog-amount')).toHaveFocus();
		});
	});

	it('traps focus inside the modal: Tab from Confirm (the last control) cycles back into the dialog', async () => {
		const user = userEvent.setup();
		render(<DialogWithTrigger />);

		// Capture the trigger element while it's still queryable — Radix
		// marks background content aria-hidden once the dialog is open, so
		// it can no longer be found via getByRole afterwards (correct
		// behavior: background content should be invisible to assistive
		// tech while a modal is open).
		const trigger = screen.getByRole('button', { name: 'Open buy dialog' });
		await user.click(trigger);
		await waitFor(() => {
			expect(screen.getByTestId('trade-dialog-amount')).toHaveFocus();
		});

		screen.getByTestId('trade-dialog-confirm').focus();
		expect(screen.getByTestId('trade-dialog-confirm')).toHaveFocus();

		await user.tab();

		// Focus must land back inside the dialog (Radix's focus guard sends it
		// to the first focusable element), never escape to the trigger button
		// behind the modal — which would be reachable if the trap were broken.
		expect(trigger).not.toHaveFocus();
		expect(document.activeElement).not.toBe(document.body);
		expect(document.activeElement).not.toBe(document.documentElement);
	});

	it('pressing Escape closes the modal', async () => {
		const user = userEvent.setup();
		const onOpenChange = vi.fn();
		render(<DialogWithTrigger onOpenChange={onOpenChange} open />);

		await waitFor(() => {
			expect(screen.getByTestId('trade-dialog-amount')).toHaveFocus();
		});

		await user.keyboard('{Escape}');

		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it('does not close on Escape while a submission is in flight', async () => {
		const user = userEvent.setup();
		const onOpenChange = vi.fn();
		render(<DialogWithTrigger onOpenChange={onOpenChange} open isSubmitting />);

		await user.keyboard('{Escape}');

		expect(onOpenChange).not.toHaveBeenCalled();
	});

	it('activates the confirm button via Enter when focused', async () => {
		const user = userEvent.setup();
		const onConfirm = vi.fn();
		render(<DialogWithTrigger onConfirm={onConfirm} open />);

		screen.getByTestId('trade-dialog-confirm').focus();
		await user.keyboard('{Enter}');

		expect(onConfirm).toHaveBeenCalledTimes(1);
	});

	it('activates the confirm button via Space when focused', async () => {
		const user = userEvent.setup();
		const onConfirm = vi.fn();
		render(<DialogWithTrigger onConfirm={onConfirm} open />);

		screen.getByTestId('trade-dialog-confirm').focus();
		await user.keyboard(' ');

		expect(onConfirm).toHaveBeenCalledTimes(1);
	});

	it('is not activatable via keyboard while disabled by an invalid amount', async () => {
		const user = userEvent.setup();
		const onConfirm = vi.fn();
		render(<DialogWithTrigger onConfirm={onConfirm} open />);

		const amountInput = screen.getByTestId('trade-dialog-amount');
		await user.clear(amountInput);
		amountInput.blur();

		screen.getByTestId('trade-dialog-confirm').focus();
		await user.keyboard('{Enter}');

		expect(onConfirm).not.toHaveBeenCalled();
	});

	it('returns focus to the trigger button when the modal closes', async () => {
		const user = userEvent.setup();
		render(<DialogWithTrigger />);

		const trigger = screen.getByRole('button', { name: 'Open buy dialog' });
		await user.click(trigger);

		await waitFor(() => {
			expect(screen.getByTestId('trade-dialog-amount')).toHaveFocus();
		});

		await user.keyboard('{Escape}');

		await waitFor(() => {
			expect(trigger).toHaveFocus();
		});
	});

	it('returns focus to the trigger when closed via the Cancel button', async () => {
		const user = userEvent.setup();
		render(<DialogWithTrigger />);

		const trigger = screen.getByRole('button', { name: 'Open buy dialog' });
		await user.click(trigger);
		await waitFor(() => {
			expect(screen.getByTestId('trade-dialog-amount')).toHaveFocus();
		});

		await user.click(screen.getByTestId('trade-dialog-cancel'));

		await waitFor(() => {
			expect(trigger).toHaveFocus();
		});
	});

	describe('sell key modal keyboard accessibility (#722)', () => {
		it('sets initial focus on the quantity input when the sell modal opens', async () => {
			const user = userEvent.setup();
			render(<DialogWithTrigger side="sell" />);

			await user.click(screen.getByRole('button', { name: 'Open sell dialog' }));

			await waitFor(() => {
				expect(screen.getByTestId('trade-dialog-amount')).toHaveFocus();
			});
		});

		it('traps focus inside the sell modal: Tab from Confirm cycles back into the dialog', async () => {
			const user = userEvent.setup();
			render(<DialogWithTrigger side="sell" />);

			const trigger = screen.getByRole('button', { name: 'Open sell dialog' });
			await user.click(trigger);
			await waitFor(() => {
				expect(screen.getByTestId('trade-dialog-amount')).toHaveFocus();
			});

			screen.getByTestId('trade-dialog-confirm').focus();
			expect(screen.getByTestId('trade-dialog-confirm')).toHaveFocus();

			await user.tab();

			expect(trigger).not.toHaveFocus();
			expect(document.activeElement).not.toBe(document.body);
			expect(document.activeElement).not.toBe(document.documentElement);
		});

		it('reaches the confirm button via Tab from the amount input in the sell modal', async () => {
			const user = userEvent.setup();
			render(<DialogWithTrigger side="sell" open />);

			await waitFor(() => {
				expect(screen.getByTestId('trade-dialog-amount')).toHaveFocus();
			});

			// #872 added the slippage tolerance selector (3 preset buttons + a
			// custom input) between the amount input and the dialog footer, so
			// Tab now passes through those before reaching Cancel/Confirm.
			let guard = 0;
			while (
				document.activeElement !== screen.getByTestId('trade-dialog-confirm') &&
				guard < 10
			) {
				await user.tab();
				guard += 1;
			}

			expect(screen.getByTestId('trade-dialog-confirm')).toHaveFocus();
		});

		it('pressing Escape closes the sell modal', async () => {
			const user = userEvent.setup();
			const onOpenChange = vi.fn();
			render(<DialogWithTrigger side="sell" onOpenChange={onOpenChange} open />);

			await waitFor(() => {
				expect(screen.getByTestId('trade-dialog-amount')).toHaveFocus();
			});

			await user.keyboard('{Escape}');

			expect(onOpenChange).toHaveBeenCalledWith(false);
		});

		it('activates the sell confirm button via Enter when focused', async () => {
			const user = userEvent.setup();
			const onConfirm = vi.fn();
			render(<DialogWithTrigger side="sell" onConfirm={onConfirm} open />);

			screen.getByTestId('trade-dialog-confirm').focus();
			await user.keyboard('{Enter}');

			expect(onConfirm).toHaveBeenCalledTimes(1);
		});

		it('activates the sell confirm button via Space when focused', async () => {
			const user = userEvent.setup();
			const onConfirm = vi.fn();
			render(<DialogWithTrigger side="sell" onConfirm={onConfirm} open />);

			screen.getByTestId('trade-dialog-confirm').focus();
			await user.keyboard(' ');

			expect(onConfirm).toHaveBeenCalledTimes(1);
		});

		it('returns focus to the sell trigger button when the modal closes', async () => {
			const user = userEvent.setup();
			render(<DialogWithTrigger side="sell" />);

			const trigger = screen.getByRole('button', { name: 'Open sell dialog' });
			await user.click(trigger);

			await waitFor(() => {
				expect(screen.getByTestId('trade-dialog-amount')).toHaveFocus();
			});

			await user.keyboard('{Escape}');

			await waitFor(() => {
				expect(trigger).toHaveFocus();
			});
		});

		it('returns focus to the sell trigger when closed via the Cancel button', async () => {
			const user = userEvent.setup();
			render(<DialogWithTrigger side="sell" />);

			const trigger = screen.getByRole('button', { name: 'Open sell dialog' });
			await user.click(trigger);
			await waitFor(() => {
				expect(screen.getByTestId('trade-dialog-amount')).toHaveFocus();
			});

			await user.click(screen.getByTestId('trade-dialog-cancel'));

			await waitFor(() => {
				expect(trigger).toHaveFocus();
			});
		});
	});
});
