import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import NotificationsPage from '@/pages/NotificationsPage';
import { useNotifications } from '@/hooks/useNotifications';
import { useProfileStore } from '@/hooks/useProfileStore';
import { useNavigationTiming } from '@/hooks/useNavigationTiming';
import type { Notification } from '@/services/notification.service';

vi.mock('@/hooks/useNotifications');
vi.mock('@/hooks/useNavigationTiming', () => ({
	useNavigationTiming: vi.fn(),
}));
vi.mock('@/hooks/useProfileStore', () => ({
	useProfileStore: vi.fn(selector =>
		selector({ profile: { id: 'user_abc' } })
	),
}));

const mockUseNotifications = vi.mocked(useNotifications);

function makeNotification(
	id: string,
	type: Notification['type']
): Notification {
	return {
		id,
		type,
		message: `Message ${id}`,
		createdAt: new Date().toISOString(),
		read: false,
		href: `/notifications/${id}`,
	};
}

function makeHookResult(
	overrides: Partial<ReturnType<typeof useNotifications>> = {}
): ReturnType<typeof useNotifications> {
	return {
		notifications: [],
		recent: [],
		latest: [],
		popoverNotifications: [],
		unreadCount: 0,
		isLoading: false,
		isError: false,
		markAsRead: vi.fn(),
		markAllAsRead: vi.fn(),
		hasNextPage: false,
		isFetchingNextPage: false,
		fetchNextPage: vi.fn(),
		...overrides,
	} as ReturnType<typeof useNotifications>;
}

function renderPage() {
	return render(
		<MemoryRouter>
			<NotificationsPage />
		</MemoryRouter>
	);
}

describe('NotificationsPage', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('filters notifications by type', async () => {
		const user = userEvent.setup();
		const mention = makeNotification('m1', 'mention');
		const order = makeNotification('o1', 'order');
		const gift = makeNotification('g1', 'gift');
		mockUseNotifications.mockReturnValue(
			makeHookResult({ notifications: [mention, order, gift], recent: [] })
		);

		renderPage();

		expect(
			screen.getByTestId('notifications-page-item-m1')
		).toBeInTheDocument();
		expect(
			screen.getByTestId('notifications-page-item-o1')
		).toBeInTheDocument();
		expect(
			screen.getByTestId('notifications-page-item-g1')
		).toBeInTheDocument();

		await user.click(screen.getByRole('tab', { name: 'Mentions' }));

		expect(
			screen.getByTestId('notifications-page-item-m1')
		).toBeInTheDocument();
		expect(
			screen.queryByTestId('notifications-page-item-o1')
		).not.toBeInTheDocument();
		expect(
			screen.queryByTestId('notifications-page-item-g1')
		).not.toBeInTheDocument();

		await user.click(screen.getByRole('tab', { name: 'Orders' }));
		expect(
			screen.getByTestId('notifications-page-item-o1')
		).toBeInTheDocument();
		expect(
			screen.queryByTestId('notifications-page-item-m1')
		).not.toBeInTheDocument();
	});

	it('loads more notifications from the sentinel and load-more button', async () => {
		const user = userEvent.setup();
		const fetchNextPage = vi.fn();
		mockUseNotifications.mockReturnValue(
			makeHookResult({
				notifications: [makeNotification('m1', 'mention')],
				recent: [],
				hasNextPage: true,
				fetchNextPage,
			})
		);

		renderPage();

		expect(screen.getByTestId('notifications-sentinel')).toBeInTheDocument();
		await user.click(screen.getByTestId('notifications-load-more'));

		expect(fetchNextPage).toHaveBeenCalled();
		expect(useNavigationTiming).toHaveBeenCalledWith('notifications');
		expect(useProfileStore).toHaveBeenCalled();
	});
});
