import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NotificationPreferencesPage from '@/pages/NotificationPreferencesPage';
import {
	NOTIFICATION_PREFERENCE_COPY,
	SAVE_ERROR_COPY,
	SAVE_SUCCESS_COPY,
} from '@/constants/notificationPreferences';
import {
	NOTIFICATION_PREFERENCE_TYPES,
	type NotificationPreferences,
} from '@/services/notificationPreferences.service';
import { getDefaultNotificationPreferences } from '@/hooks/useNotificationPreferences';
import type { Signer } from '@/lib/signing/types';

const { toastSuccess, toastError } = vi.hoisted(() => ({
	toastSuccess: vi.fn(),
	toastError: vi.fn(),
}));

vi.mock('@/utils/toast.util', () => ({
	default: { success: toastSuccess, error: toastError },
}));

vi.mock('@/hooks/useStellarWallet', () => ({
	useStellarWallet: () => ({
		address: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
		activeSigner: { type: 'software', sign: vi.fn(), getPublicKey: vi.fn() },
		isConnected: true,
		loading: false,
	}),
}));

function getSwitch(name: string) {
	return screen.getByRole('switch', { name });
}

function renderPage(
	fetchPreferences = vi.fn<
		(address: string) => Promise<NotificationPreferences | null | undefined>
	>(async () => getDefaultNotificationPreferences()),
	updatePreferences = vi.fn<
		(
			_address: string,
			_preferences: NotificationPreferences,
			_signer: Signer
		) => Promise<void>
	>(async () => {})
) {
	render(
		<MemoryRouter>
			<NotificationPreferencesPage
				fetchPreferences={fetchPreferences}
				updatePreferences={updatePreferences}
			/>
		</MemoryRouter>
	);
	return { fetchPreferences, updatePreferences };
}

describe('NotificationPreferencesPage', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('loads each on-chain alert toggle with the saved preference', async () => {
		const preferences = {
			...getDefaultNotificationPreferences(),
			settlement: false,
			auto_invest: false,
		};
		const { fetchPreferences } = renderPage(vi.fn(async () => preferences));

		await screen.findByText('Settlement');
		expect(fetchPreferences).toHaveBeenCalledWith(
			'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF'
		);
		for (const type of NOTIFICATION_PREFERENCE_TYPES) {
			expect(
				screen.getByText(NOTIFICATION_PREFERENCE_COPY[type].label)
			).toBeInTheDocument();
			expect(
				getSwitch(NOTIFICATION_PREFERENCE_COPY[type].label)
			).toHaveAttribute('aria-checked', String(preferences[type]));
		}
	});

	it('defaults wallets without saved preferences to all alerts enabled', async () => {
		renderPage(vi.fn(async () => null));

		await screen.findByText('Settlement');
		for (const type of NOTIFICATION_PREFERENCE_TYPES) {
			expect(
				getSwitch(NOTIFICATION_PREFERENCE_COPY[type].label)
			).toHaveAttribute('aria-checked', 'true');
		}
	});

	it('submits all toggles and toasts only after the contract call succeeds', async () => {
		const { updatePreferences } = renderPage();
		await screen.findByText('Settlement');

		fireEvent.click(getSwitch('Settlement'));
		fireEvent.click(getSwitch('Auto-invest'));
		const saveButton = screen.getByRole('button', {
			name: 'Save preferences',
		});
		expect(saveButton).toBeEnabled();

		fireEvent.click(saveButton);
		await waitFor(() =>
			expect(toastSuccess).toHaveBeenCalledWith(SAVE_SUCCESS_COPY)
		);
		expect(updatePreferences).toHaveBeenCalledTimes(1);
		expect(updatePreferences.mock.calls[0][1]).toEqual({
			settlement: false,
			kyc_expiry: true,
			watchlist_change: true,
			auto_invest: false,
			maturity_approaching: true,
		} satisfies NotificationPreferences);
	});

	it('keeps edits and shows an error when saving fails', async () => {
		const updatePreferences = vi
			.fn<() => Promise<void>>()
			.mockRejectedValue(new Error('Transaction failed'));
		renderPage(undefined, updatePreferences);
		await screen.findByText('Settlement');

		fireEvent.click(getSwitch('KYC expiry'));
		fireEvent.click(screen.getByRole('button', { name: 'Save preferences' }));

		expect(await screen.findByRole('alert')).toHaveTextContent(
			SAVE_ERROR_COPY
		);
		expect(toastError).toHaveBeenCalledWith(SAVE_ERROR_COPY);
		expect(toastSuccess).not.toHaveBeenCalled();
		expect(getSwitch('KYC expiry')).toHaveAttribute('aria-checked', 'false');
	});

	it('shows a load error with a working retry', async () => {
		const fetchPreferences = vi
			.fn<() => Promise<NotificationPreferences | null>>()
			.mockRejectedValueOnce(new Error('RPC unavailable'))
			.mockResolvedValue(getDefaultNotificationPreferences());
		renderPage(fetchPreferences);

		expect(await screen.findByRole('alert')).toHaveTextContent(
			/couldn't load/i
		);
		fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

		await screen.findByText('Settlement');
		expect(fetchPreferences).toHaveBeenCalledTimes(2);
	});
});
