import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import NotificationBell from '@/components/common/NotificationBell';
import { useNotifications } from '@/hooks/useNotifications';
import type { Notification } from '@/services/notification.service';

vi.mock('@/hooks/useNotifications');
vi.mock('react-router', async () => {
	const actual = await vi.importActual<typeof import('react-router')>('react-router');
	return { ...actual, useNavigate: vi.fn(() => vi.fn()) };
});

const mockUseNotifications = vi.mocked(useNotifications);

function makeNotification(
	id: string,
	overrides: Partial<Notification> = {}
): Notification {
	return {
		id,
		type: 'new_follower',
		message: `Notification message ${id}`,
		createdAt: new Date(Date.now() - 60_000).toISOString(),
		read: false,
		href: `/creator/${id}`,
		...overrides,
	};
}

function renderBell(userId = 'user_abc') {
	return render(
		<MemoryRouter>
			<NotificationBell userId={userId} />
		</MemoryRouter>
	);
}

describe('NotificationBell', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ── Badge visibility ─────────────────────────────────────────────────────

	it('does not show the unread badge when unreadCount is 0', () => {
		mockUseNotifications.mockReturnValue({
			notifications: [],
			recent: [],
			unreadCount: 0,
			isLoading: false,
			isError: false,
			markAsRead: vi.fn(),
			markAllAsRead: vi.fn(),
		});

		renderBell();

		expect(
			screen.queryByTestId('notification-unread-badge')
		).not.toBeInTheDocument();
	});

	it('shows the unread badge with the correct count when unreadCount > 0', () => {
		mockUseNotifications.mockReturnValue({
			notifications: [makeNotification('n1')],
			recent: [makeNotification('n1')],
			unreadCount: 3,
			isLoading: false,
			isError: false,
			markAsRead: vi.fn(),
			markAllAsRead: vi.fn(),
		});

		renderBell();

		const badge = screen.getByTestId('notification-unread-badge');
		expect(badge).toBeInTheDocument();
		expect(badge).toHaveTextContent('3');
	});

	it('caps the badge display at 99+ when unreadCount > 99', () => {
		mockUseNotifications.mockReturnValue({
			notifications: [],
			recent: [],
			unreadCount: 150,
			isLoading: false,
			isError: false,
			markAsRead: vi.fn(),
			markAllAsRead: vi.fn(),
		});

		renderBell();

		expect(screen.getByTestId('notification-unread-badge')).toHaveTextContent(
			'99+'
		);
	});

	// ── Accessible label ─────────────────────────────────────────────────────

	it('gives the bell button an accessible label mentioning unread count', () => {
		mockUseNotifications.mockReturnValue({
			notifications: [],
			recent: [],
			unreadCount: 2,
			isLoading: false,
			isError: false,
			markAsRead: vi.fn(),
			markAllAsRead: vi.fn(),
		});

		renderBell();

		expect(
			screen.getByRole('button', { name: /notifications — 2 unread/i })
		).toBeInTheDocument();
	});

	it('uses a generic label when unreadCount is 0', () => {
		mockUseNotifications.mockReturnValue({
			notifications: [],
			recent: [],
			unreadCount: 0,
			isLoading: false,
			isError: false,
			markAsRead: vi.fn(),
			markAllAsRead: vi.fn(),
		});

		renderBell();

		expect(
			screen.getByRole('button', { name: /^notifications$/i })
		).toBeInTheDocument();
	});

	// ── Dropdown content & Drawer ─────────────────────────────────────────────

	it('opens the dropdown drawer when the bell is clicked', async () => {
		const user = userEvent.setup();
		mockUseNotifications.mockReturnValue({
			notifications: [],
			recent: [],
			unreadCount: 0,
			isLoading: false,
			isError: false,
			markAsRead: vi.fn(),
			markAllAsRead: vi.fn(),
		});

		renderBell();

		await user.click(screen.getByRole('button', { name: /notifications/i }));

		expect(
			screen.getByTestId('notification-dropdown')
		).toBeInTheDocument();
	});

	it('calls markAllAsRead when drawer opens with unread items', async () => {
		const user = userEvent.setup();
		const markAllAsRead = vi.fn();
		mockUseNotifications.mockReturnValue({
			notifications: [makeNotification('n1')],
			recent: [makeNotification('n1')],
			unreadCount: 1,
			isLoading: false,
			isError: false,
			markAsRead: vi.fn(),
			markAllAsRead,
		});

		renderBell();
		await user.click(screen.getByRole('button', { name: /notifications/i }));

		expect(markAllAsRead).toHaveBeenCalled();
	});

	it('renders distinct icons for trade_completed, lockup_expiring, and price_moved', async () => {
		const user = userEvent.setup();
		const recent = [
			makeNotification('n1', { type: 'trade_completed', message: 'Trade executed' }),
			makeNotification('n2', { type: 'lockup_expiring', message: 'Lockup expiring soon' }),
			makeNotification('n3', { type: 'price_moved', message: 'Price surged 15%' }),
		];
		mockUseNotifications.mockReturnValue({
			notifications: recent,
			recent,
			unreadCount: 0,
			isLoading: false,
			isError: false,
			markAsRead: vi.fn(),
			markAllAsRead: vi.fn(),
		});

		renderBell();
		await user.click(screen.getByRole('button', { name: /notifications/i }));

		expect(screen.getByTestId('icon-trade_completed')).toBeInTheDocument();
		expect(screen.getByTestId('icon-lockup_expiring')).toBeInTheDocument();
		expect(screen.getByTestId('icon-price_moved')).toBeInTheDocument();
	});

	it('shows the empty state when there are no notifications', async () => {
		const user = userEvent.setup();
		mockUseNotifications.mockReturnValue({
			notifications: [],
			recent: [],
			unreadCount: 0,
			isLoading: false,
			isError: false,
			markAsRead: vi.fn(),
			markAllAsRead: vi.fn(),
		});

		renderBell();
		await user.click(screen.getByRole('button', { name: /notifications/i }));

		expect(
			screen.getByTestId('notification-empty-state')
		).toBeInTheDocument();
		expect(
			screen.getByText('No notifications yet')
		).toBeInTheDocument();
	});

	it('shows skeleton rows while loading', async () => {
		const user = userEvent.setup();
		mockUseNotifications.mockReturnValue({
			notifications: [],
			recent: [],
			unreadCount: 0,
			isLoading: true,
			isError: false,
			markAsRead: vi.fn(),
			markAllAsRead: vi.fn(),
		});

		renderBell();
		await user.click(screen.getByRole('button', { name: /notifications/i }));

		expect(screen.getByTestId('notification-loading')).toBeInTheDocument();
		expect(
			screen.queryByTestId('notification-empty-state')
		).not.toBeInTheDocument();
	});

	it('renders up to five notification items in the dropdown', async () => {
		const user = userEvent.setup();
		const recent = [
			makeNotification('n1'),
			makeNotification('n2'),
			makeNotification('n3'),
			makeNotification('n4'),
			makeNotification('n5'),
		];
		mockUseNotifications.mockReturnValue({
			notifications: recent,
			recent,
			unreadCount: 5,
			isLoading: false,
			isError: false,
			markAsRead: vi.fn(),
			markAllAsRead: vi.fn(),
		});

		renderBell();
		await user.click(screen.getByRole('button', { name: /notifications/i }));

		for (const n of recent) {
			expect(
				screen.getByTestId(`notification-item-${n.id}`)
			).toBeInTheDocument();
		}
	});

	it('shows the notification message text for each item', async () => {
		const user = userEvent.setup();
		const recent = [makeNotification('n1', { message: 'Alice followed you' })];
		mockUseNotifications.mockReturnValue({
			notifications: recent,
			recent,
			unreadCount: 1,
			isLoading: false,
			isError: false,
			markAsRead: vi.fn(),
			markAllAsRead: vi.fn(),
		});

		renderBell();
		await user.click(screen.getByRole('button', { name: /notifications/i }));

		expect(screen.getByText('Alice followed you')).toBeInTheDocument();
	});

	// ── Marking read ─────────────────────────────────────────────────────────

	it('calls markAsRead with the notification id when an item is clicked', async () => {
		const user = userEvent.setup();
		const markAsRead = vi.fn();
		const recent = [makeNotification('n1')];
		mockUseNotifications.mockReturnValue({
			notifications: recent,
			recent,
			unreadCount: 1,
			isLoading: false,
			isError: false,
			markAsRead,
			markAllAsRead: vi.fn(),
		});

		renderBell();
		await user.click(screen.getByRole('button', { name: /notifications/i }));
		await user.click(screen.getByTestId('notification-item-n1'));

		expect(markAsRead).toHaveBeenCalledWith('n1');
	});

	// ── View all link ────────────────────────────────────────────────────────

	it('renders a "View all" link in the dropdown', async () => {
		const user = userEvent.setup();
		mockUseNotifications.mockReturnValue({
			notifications: [],
			recent: [],
			unreadCount: 0,
			isLoading: false,
			isError: false,
			markAsRead: vi.fn(),
			markAllAsRead: vi.fn(),
		});

		renderBell();
		await user.click(screen.getByRole('button', { name: /notifications/i }));

		expect(
			screen.getByTestId('notification-view-all')
		).toBeInTheDocument();
		expect(
			screen.getByTestId('notification-view-all')
		).toHaveTextContent('View all');
	});

	// ── Badge decrement ──────────────────────────────────────────────────────

	it('badge count decrements after a notification is marked read', async () => {
		const markAsRead = vi.fn();

		// Start with count = 2
		mockUseNotifications.mockReturnValue({
			notifications: [
				makeNotification('n1', { read: false }),
				makeNotification('n2', { read: false }),
			],
			recent: [
				makeNotification('n1', { read: false }),
				makeNotification('n2', { read: false }),
			],
			unreadCount: 2,
			isLoading: false,
			isError: false,
			markAsRead,
			markAllAsRead: vi.fn(),
		});

		const { rerender } = renderBell();

		expect(screen.getByTestId('notification-unread-badge')).toHaveTextContent(
			'2'
		);

		// Simulate the hook returning updated state after markAsRead is called
		mockUseNotifications.mockReturnValue({
			notifications: [
				makeNotification('n1', { read: true }),
				makeNotification('n2', { read: false }),
			],
			recent: [
				makeNotification('n1', { read: true }),
				makeNotification('n2', { read: false }),
			],
			unreadCount: 1,
			isLoading: false,
			isError: false,
			markAsRead,
			markAllAsRead: vi.fn(),
		});

		rerender(
			<MemoryRouter>
				<NotificationBell userId="user_abc" />
			</MemoryRouter>
		);

		await waitFor(() => {
			expect(
				screen.getByTestId('notification-unread-badge')
			).toHaveTextContent('1');
		});
	});
});
