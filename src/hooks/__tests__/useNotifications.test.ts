import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import type { NotificationsResponse } from '@/services/notification.service';

const USER_ID = 'user_abc123';

function makeResponse(
	overrides: Partial<NotificationsResponse> = {}
): NotificationsResponse {
	return {
		notifications: [],
		unreadCount: 0,
		...overrides,
	};
}

function makeWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false, gcTime: 0 } },
	});
	return ({ children }: { children: React.ReactNode }) =>
		React.createElement(
			QueryClientProvider,
			{ client: queryClient },
			children
		);
}

describe('useNotifications', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('returns isLoading=true before the query resolves', () => {
		const fetchFn = vi.fn(() => new Promise<NotificationsResponse>(() => {}));
		const { result } = renderHook(
			() => useNotifications(USER_ID, fetchFn),
			{ wrapper: makeWrapper() }
		);
		expect(result.current.isLoading).toBe(true);
	});

	it('returns empty recent and zero unreadCount while loading', () => {
		const fetchFn = vi.fn(() => new Promise<NotificationsResponse>(() => {}));
		const { result } = renderHook(
			() => useNotifications(USER_ID, fetchFn),
			{ wrapper: makeWrapper() }
		);
		expect(result.current.recent).toEqual([]);
		expect(result.current.unreadCount).toBe(0);
	});

	it('returns resolved notifications and unreadCount', async () => {
		const notifications = [
			{
				id: 'n1',
				type: 'new_follower' as const,
				message: 'Alice started following you',
				createdAt: new Date().toISOString(),
				read: false,
				href: '/creator/alice',
			},
		];
		const fetchFn = vi.fn().mockResolvedValue(
			makeResponse({ notifications, unreadCount: 1 })
		);

		const { result } = renderHook(
			() => useNotifications(USER_ID, fetchFn),
			{ wrapper: makeWrapper() }
		);

		await waitFor(() => expect(result.current.isLoading).toBe(false));

		expect(result.current.recent).toHaveLength(1);
		expect(result.current.recent[0].id).toBe('n1');
		expect(result.current.unreadCount).toBe(1);
	});

	it('caps recent at five notifications even when the API returns more', async () => {
		const notifications = Array.from({ length: 8 }, (_, i) => ({
			id: `n${i}`,
			type: 'new_follower' as const,
			message: `Notification ${i}`,
			createdAt: new Date().toISOString(),
			read: false,
			href: `/creator/${i}`,
		}));
		const fetchFn = vi.fn().mockResolvedValue(
			makeResponse({ notifications, unreadCount: 8 })
		);

		const { result } = renderHook(
			() => useNotifications(USER_ID, fetchFn),
			{ wrapper: makeWrapper() }
		);

		await waitFor(() => expect(result.current.isLoading).toBe(false));

		expect(result.current.recent).toHaveLength(5);
	});

	it('does not fetch when userId is empty', () => {
		const fetchFn = vi.fn();
		renderHook(() => useNotifications('', fetchFn), {
			wrapper: makeWrapper(),
		});
		expect(fetchFn).not.toHaveBeenCalled();
	});

	it('applies an optimistic read update when markAsRead is called', async () => {
		const notifications = [
			{
				id: 'n1',
				type: 'new_follower' as const,
				message: 'Alice started following you',
				createdAt: new Date().toISOString(),
				read: false,
				href: '/creator/alice',
			},
			{
				id: 'n2',
				type: 'key_purchase' as const,
				message: 'Bob bought your key',
				createdAt: new Date().toISOString(),
				read: false,
				href: '/creator/bob',
			},
		];

		// markAsRead hits the real notificationService — stub the module-level
		// singleton so we can make it resolve without a real server.
		vi.mock('@/services/notification.service', () => ({
			notificationService: {
				getNotifications: vi.fn(),
				markAsRead: vi.fn().mockResolvedValue(undefined),
			},
			NotificationService: vi.fn(),
		}));

		const fetchFn = vi.fn().mockResolvedValue(
			makeResponse({ notifications, unreadCount: 2 })
		);

		const { result } = renderHook(
			() => useNotifications(USER_ID, fetchFn),
			{ wrapper: makeWrapper() }
		);

		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current.unreadCount).toBe(2);

		act(() => {
			result.current.markAsRead('n1');
		});

		// After the optimistic update the count should drop by 1.
		await waitFor(() => expect(result.current.unreadCount).toBe(1));

		// The mutated notification should now appear as read.
		const n1 = result.current.recent.find(n => n.id === 'n1');
		expect(n1?.read).toBe(true);

		// The other notification remains unread.
		const n2 = result.current.recent.find(n => n.id === 'n2');
		expect(n2?.read).toBe(false);
	});
});
