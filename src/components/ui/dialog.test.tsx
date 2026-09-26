import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from './dialog';

describe('DialogContent', () => {
	it('adds mobile safe-area bottom inset padding and restores desktop spacing', () => {
		render(
			<Dialog open>
				<DialogContent>Dialog body</DialogContent>
			</Dialog>
		);

		const content = screen.getByRole('dialog');
		expect(content.className).toContain(
			'pb-[calc(1.5rem+env(safe-area-inset-bottom))]'
		);
		expect(content.className).toContain('sm:pb-6');
	});

	it('shows the escape hint by default', () => {
		render(
			<Dialog open>
				<DialogContent>Dialog body</DialogContent>
			</Dialog>
		);

		expect(screen.getByText('Esc to close')).toBeInTheDocument();
	});

	it('hides the escape hint when explicitly disabled', () => {
		render(
			<Dialog open>
				<DialogContent showEscapeHint={false}>Dialog body</DialogContent>
			</Dialog>
		);

		expect(screen.queryByText('Esc to close')).not.toBeInTheDocument();
	});
});

/**
 * Accessibility contract for the shared Dialog primitive (#876).
 *
 * The dialog/a11y behavior below (role, aria-modal, aria-labelledby,
 * focus trap, Escape dismissal, focus move-in/restore-out) is provided
 * by @radix-ui/react-dialog, which every modal in this app (TradeDialog,
 * BatchBuyModal, ReinvestDividendDialog, PendingTxModal,
 * TransactionFailureDrawer, SetCoCreatorModal, ConnectWalletButton's
 * dialogs, OracleAccessPanel, and BottomSheet) already builds on via
 * `DialogContent`/`BottomSheetContent`. These tests lock in that
 * contract at the shared-component level so a future change to
 * `dialog.tsx` (e.g. swapping the underlying primitive, or passing
 * `modal={false}`) can't silently regress accessibility across every
 * modal in the app at once.
 */
describe('DialogContent accessibility (#876)', () => {
	it('exposes role="dialog" and aria-modal="true"', () => {
		render(
			<Dialog open>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Example dialog</DialogTitle>
					</DialogHeader>
					Dialog body
				</DialogContent>
			</Dialog>
		);

		const content = screen.getByRole('dialog');
		expect(content).toHaveAttribute('aria-modal', 'true');
	});

	it('associates the dialog title via aria-labelledby', () => {
		render(
			<Dialog open>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Example dialog</DialogTitle>
					</DialogHeader>
					Dialog body
				</DialogContent>
			</Dialog>
		);

		const content = screen.getByRole('dialog');
		const labelledBy = content.getAttribute('aria-labelledby');
		expect(labelledBy).toBeTruthy();

		const title = screen.getByText('Example dialog');
		expect(title.id).toBe(labelledBy);
	});

	it('moves focus to the first focusable element on open', async () => {
		render(
			<Dialog open>
				<DialogContent showCloseButton={false}>
					<DialogHeader>
						<DialogTitle>Example dialog</DialogTitle>
					</DialogHeader>
					<button type="button">First action</button>
					<button type="button">Second action</button>
				</DialogContent>
			</Dialog>
		);

		// Radix moves focus to the first focusable descendant of the
		// content on open (our "First action" button).
		await vi.waitFor(() => {
			expect(
				screen.getByRole('button', { name: 'First action' })
			).toHaveFocus();
		});
	});

	it('traps Tab focus within the dialog', async () => {
		const user = userEvent.setup();
		render(
			<Dialog open>
				<DialogContent showCloseButton={false}>
					<DialogHeader>
						<DialogTitle>Example dialog</DialogTitle>
					</DialogHeader>
					<button type="button">First action</button>
					<button type="button">Second action</button>
				</DialogContent>
			</Dialog>
		);

		const first = screen.getByRole('button', { name: 'First action' });
		const second = screen.getByRole('button', { name: 'Second action' });

		first.focus();
		expect(first).toHaveFocus();

		await user.tab();
		expect(second).toHaveFocus();

		// Tabbing past the last focusable element cycles back to the first
		// rather than escaping the dialog into the rest of the page.
		await user.tab();
		expect(first).toHaveFocus();

		// Shift+Tab from the first element cycles back to the last.
		await user.tab({ shift: true });
		expect(second).toHaveFocus();
	});

	it('dismisses on Escape regardless of which element inside has focus', async () => {
		const user = userEvent.setup();
		const onOpenChange = vi.fn();
		render(
			<Dialog open onOpenChange={onOpenChange}>
				<DialogContent showCloseButton={false}>
					<DialogHeader>
						<DialogTitle>Example dialog</DialogTitle>
					</DialogHeader>
					<button type="button">First action</button>
					<button type="button">Second action</button>
				</DialogContent>
			</Dialog>
		);

		const second = screen.getByRole('button', { name: 'Second action' });
		second.focus();
		expect(second).toHaveFocus();

		await user.keyboard('{Escape}');

		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it('restores focus to the trigger element on close', async () => {
		// Radix's built-in focus-return-to-trigger targets its own
		// internal triggerRef, which is only wired up when the dialog is
		// opened via <DialogTrigger> (as opposed to being driven purely by
		// external open/onOpenChange props, the pattern TradeDialog uses
		// and documents as a deliberate exception — see the comment on
		// `triggerElementRef` in TradeDialog.tsx).
		const user = userEvent.setup();

		function Harness() {
			const [open, setOpen] = useState(false);
			return (
				<Dialog open={open} onOpenChange={setOpen}>
					<DialogTrigger asChild>
						<button type="button">Open dialog</button>
					</DialogTrigger>
					<DialogContent showCloseButton={false}>
						<DialogHeader>
							<DialogTitle>Example dialog</DialogTitle>
						</DialogHeader>
						<DialogClose asChild>
							<button type="button">Close</button>
						</DialogClose>
					</DialogContent>
				</Dialog>
			);
		}

		render(<Harness />);

		const trigger = screen.getByRole('button', { name: 'Open dialog' });
		await user.click(trigger);

		const closeButton = await screen.findByRole('button', { name: 'Close' });
		await user.click(closeButton);

		await vi.waitFor(() => {
			expect(trigger).toHaveFocus();
		});
	});
});
