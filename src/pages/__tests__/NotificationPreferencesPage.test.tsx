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
import { setAllNotificationPreferences } from '@/hooks/useNotificationPreferences';

const { toastSuccess, toastError } = vi.hoisted(() => ({
	toastSuccess: vi.fn(),
	toastError: vi.fn(),
}));

vi.mock('@/utils/toast.util', () => ({
	default: { success: toastSuccess, error: toastError },
}));

function makePreferences(): NotificationPreferences {
	return {
		...setAllNotificationPreferences(false),
		price_alert: { email: true, inApp: true },
		staking_reward: { email: false, inApp: true },
	};
}

function getSwitch(name: string) {
	return screen.getByRole('switch', { name });
}

function renderPage(
	fetchPreferences = vi.fn(async () => makePreferences()),
	updatePreferences = vi.fn(async (next: NotificationPreferences) => next)
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

// Multi-step render flows; allow headroom on loaded CI runners.
describe('NotificationPreferencesPage', { timeout: 15_000 }, () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders every notification type with the state returned by the API', async () => {
		renderPage();

		await screen.findByText('Price alert triggered');

		for (const type of NOTIFICATION_PREFERENCE_TYPES) {
			expect(
				screen.getByText(NOTIFICATION_PREFERENCE_COPY[type].label)
			).toBeInTheDocument();
		}

		expect(
			getSwitch('Price alert triggered email notifications')
		).toHaveAttribute('aria-checked', 'true');
		expect(getSwitch('Staking reward email notifications')).toHaveAttribute(
			'aria-checked',
			'false'
		);
		expect(getSwitch('Staking reward in-app notifications')).toHaveAttribute(
			'aria-checked',
			'true'
		);
		expect(getSwitch('Key deprecated in-app notifications')).toHaveAttribute(
			'aria-checked',
			'false'
		);
	});

	it('fills in types the API omits instead of crashing', async () => {
		renderPage(
			vi.fn(
				async () =>
					({
						price_alert: { email: true, inApp: false },
					}) as unknown as NotificationPreferences
			)
		);

		await screen.findByText('Key deprecated');
		expect(
			getSwitch('Price alert triggered in-app notifications')
		).toHaveAttribute('aria-checked', 'false');
		expect(getSwitch('Key deprecated in-app notifications')).toHaveAttribute(
			'aria-checked',
			'true'
		);
	});

	it('saves a single per-type, per-channel toggle and confirms with a toast', async () => {
		const { updatePreferences } = renderPage();
		await screen.findByText('Governance vote');

		fireEvent.click(getSwitch('Governance vote email notifications'));

		expect(getSwitch('Governance vote email notifications')).toHaveAttribute(
			'aria-checked',
			'true'
		);
		await waitFor(() =>
			expect(toastSuccess).toHaveBeenCalledWith(SAVE_SUCCESS_COPY)
		);

		expect(updatePreferences).toHaveBeenCalledTimes(1);
		const sent = updatePreferences.mock.calls[0][0];
		expect(sent.governance_vote).toEqual({ email: true, inApp: false });
		// Other rows are untouched.
		expect(sent.price_alert).toEqual({ email: true, inApp: true });
		expect(sent.staking_reward).toEqual({ email: false, inApp: true });
	});

	it('bulk toggle enables every type on both channels', async () => {
		const { updatePreferences } = renderPage();
		await screen.findByText('Governance vote');

		const bulk = getSwitch('All notifications');
		expect(bulk).toHaveAttribute('aria-checked', 'false');
		fireEvent.click(bulk);

		await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
		expect(updatePreferences).toHaveBeenLastCalledWith(
			setAllNotificationPreferences(true)
		);
		expect(getSwitch('All notifications')).toHaveAttribute(
			'aria-checked',
			'true'
		);
		for (const sw of screen.getAllByRole('switch')) {
			expect(sw).toHaveAttribute('aria-checked', 'true');
		}
	});

	it('bulk toggle disables every type when all are enabled', async () => {
		const { updatePreferences } = renderPage(
			vi.fn(async () => setAllNotificationPreferences(true))
		);
		await screen.findByText('Governance vote');

		const bulk = getSwitch('All notifications');
		expect(bulk).toHaveAttribute('aria-checked', 'true');
		fireEvent.click(bulk);

		await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
		expect(updatePreferences).toHaveBeenLastCalledWith(
			setAllNotificationPreferences(false)
		);
		for (const sw of screen.getAllByRole('switch')) {
			expect(sw).toHaveAttribute('aria-checked', 'false');
		}
	});

	it('rolls back a failed save, shows an error, and retries the same change', async () => {
		const updatePreferences = vi
			.fn<
				(next: NotificationPreferences) => Promise<NotificationPreferences>
			>()
			.mockRejectedValueOnce(new Error('Network error'))
			.mockImplementation(async next => next);
		renderPage(undefined, updatePreferences);
		await screen.findByText('Vesting cliff');

		fireEvent.click(getSwitch('Vesting cliff email notifications'));

		const alert = await screen.findByRole('alert');
		expect(alert).toHaveTextContent(SAVE_ERROR_COPY);
		expect(toastError).toHaveBeenCalledWith(SAVE_ERROR_COPY);
		expect(toastSuccess).not.toHaveBeenCalled();
		expect(getSwitch('Vesting cliff email notifications')).toHaveAttribute(
			'aria-checked',
			'false'
		);

		fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

		await waitFor(() =>
			expect(toastSuccess).toHaveBeenCalledWith(SAVE_SUCCESS_COPY)
		);
		expect(updatePreferences).toHaveBeenCalledTimes(2);
		expect(updatePreferences.mock.calls[1][0].vesting_cliff).toEqual({
			email: true,
			inApp: false,
		});
		expect(getSwitch('Vesting cliff email notifications')).toHaveAttribute(
			'aria-checked',
			'true'
		);
		expect(screen.queryByRole('alert')).not.toBeInTheDocument();
	});

	it('shows a load error with a working retry', async () => {
		const fetchPreferences = vi
			.fn<() => Promise<NotificationPreferences>>()
			.mockRejectedValueOnce(new Error('boom'))
			.mockResolvedValue(makePreferences());
		renderPage(fetchPreferences);

		const alert = await screen.findByRole('alert');
		expect(alert).toHaveTextContent(/couldn't load/i);

		fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

		await screen.findByText('Price alert triggered');
		expect(fetchPreferences).toHaveBeenCalledTimes(2);
	});
});
