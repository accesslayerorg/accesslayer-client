import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import SessionExpiryModal from '@/components/common/SessionExpiryModal';

function renderModal(overrides: Partial<Parameters<typeof SessionExpiryModal>[0]> = {}) {
	const onRenew = vi.fn();
	const onLogout = vi.fn();
	const utils = render(
		<SessionExpiryModal
			open
			isRenewing={false}
			renewError={null}
			onRenew={onRenew}
			onLogout={onLogout}
			{...overrides}
		/>
	);
	return { ...utils, onRenew, onLogout };
}

describe('SessionExpiryModal (#878)', () => {
	it('is not rendered when closed', () => {
		renderModal({ open: false });
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
	});

	it('shows the expiry warning copy and both actions when open', () => {
		renderModal();

		expect(screen.getByRole('dialog')).toBeInTheDocument();
		expect(
			screen.getByText(
				'Your session expires in 5 minutes. Renew to stay logged in.'
			)
		).toBeInTheDocument();
		expect(
			screen.getByTestId('session-expiry-renew-button')
		).toBeInTheDocument();
		expect(
			screen.getByTestId('session-expiry-logout-button')
		).toBeInTheDocument();
	});

	it('associates the dialog title via aria-labelledby (#876 contract)', () => {
		renderModal();
		const dialog = screen.getByRole('dialog');
		expect(dialog).toHaveAttribute('aria-modal', 'true');
		const labelledBy = dialog.getAttribute('aria-labelledby');
		expect(labelledBy).toBeTruthy();
		expect(screen.getByText('Session expiring soon').id).toBe(labelledBy);
	});

	it('calls onRenew when "Renew Session" is clicked', async () => {
		const user = userEvent.setup();
		const { onRenew } = renderModal();

		await user.click(screen.getByTestId('session-expiry-renew-button'));

		expect(onRenew).toHaveBeenCalledTimes(1);
	});

	it('calls onLogout when "Log Out" is clicked', async () => {
		const user = userEvent.setup();
		const { onLogout } = renderModal();

		await user.click(screen.getByTestId('session-expiry-logout-button'));

		expect(onLogout).toHaveBeenCalledTimes(1);
	});

	it('disables both actions while renewing', () => {
		renderModal({ isRenewing: true });

		expect(screen.getByTestId('session-expiry-renew-button')).toBeDisabled();
		expect(screen.getByTestId('session-expiry-logout-button')).toBeDisabled();
	});

	it('shows a renew error via a polite alert when present', () => {
		renderModal({ renewError: 'Failed to renew session. Please try again.' });

		const alert = screen.getByTestId('session-expiry-renew-error');
		expect(alert).toHaveTextContent(
			'Failed to renew session. Please try again.'
		);
		expect(alert).toHaveAttribute('aria-live', 'polite');
	});

	it('does not show a renew error when renewError is null', () => {
		renderModal({ renewError: null });
		expect(
			screen.queryByTestId('session-expiry-renew-error')
		).not.toBeInTheDocument();
	});

	it('ignores Escape so the warning cannot be dismissed accidentally', async () => {
		const user = userEvent.setup();
		const { onLogout, onRenew } = renderModal();

		await user.keyboard('{Escape}');

		expect(screen.getByRole('dialog')).toBeInTheDocument();
		expect(onLogout).not.toHaveBeenCalled();
		expect(onRenew).not.toHaveBeenCalled();
	});

	it('does not show the "Esc to close" hint, since Escape is disabled', () => {
		renderModal();
		expect(screen.queryByText('Esc to close')).not.toBeInTheDocument();
	});
});
