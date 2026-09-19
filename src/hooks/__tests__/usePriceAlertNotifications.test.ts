import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useNotifications, checkPriceAlerts } from '@/hooks/useNotifications';
import type { PriceAlert } from '@/services/alert.service';
import type { NotificationsResponse } from '@/services/notification.service';

const USER_ID = 'user_test_alerts';

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

describe('useNotifications - In-App Price Alerts (Issue #883)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('triggers price_alert notification and marks backend when price crosses above target', async () => {
		const activeAlerts: PriceAlert[] = [
			{
				id: 'alert_1',
				userId: USER_ID,
				keyId: 'key_alpha',
				keyName: 'Alpha Key',
				targetPrice: 2.5,
				direction: 'above',
			},
		];

		const getActiveAlerts = vi.fn().mockResolvedValue(activeAlerts);
		const getKeyPrice = vi.fn().mockResolvedValue(2.8); // 2.8 >= 2.5 (crossed above)
		const markAlertTriggered = vi.fn().mockResolvedValue(undefined);
		const fetchNotifications = vi.fn().mockResolvedValue({
			notifications: [],
			unreadCount: 0,
		} as NotificationsResponse);

		const { result } = renderHook(
			() =>
				useNotifications(USER_ID, {
					fetchNotifications,
					getActiveAlerts,
					getKeyPrice,
					markAlertTriggered,
				}),
			{ wrapper: makeWrapper() }
		);

		await waitFor(() => expect(result.current.isLoading).toBe(false));

		// Verify notification was added
		expect(result.current.notifications.length).toBe(1);
		const notif = result.current.notifications[0];
		expect(notif.type).toBe('price_alert');
		expect(notif.message).toContain('Alpha Key');
		expect(notif.message).toContain('above target price (2.5 ETH)');
		expect(notif.message).toContain('current price is 2.8 ETH');
		expect(notif.href).toBe('/key/key_alpha');
		expect(result.current.unreadCount).toBe(1);

		// Verify alert marked as triggered on backend
		expect(markAlertTriggered).toHaveBeenCalledWith('alert_1');
	});

	it('triggers price_alert notification when price crosses below target', async () => {
		const activeAlerts: PriceAlert[] = [
			{
				id: 'alert_2',
				userId: USER_ID,
				keyId: 'key_beta',
				keyName: 'Beta Key',
				targetPrice: 1.0,
				direction: 'below',
			},
		];

		const getActiveAlerts = vi.fn().mockResolvedValue(activeAlerts);
		const getKeyPrice = vi.fn().mockResolvedValue(0.95); // 0.95 <= 1.0 (crossed below)
		const markAlertTriggered = vi.fn().mockResolvedValue(undefined);
		const fetchNotifications = vi.fn().mockResolvedValue({
			notifications: [],
			unreadCount: 0,
		} as NotificationsResponse);

		const { result } = renderHook(
			() =>
				useNotifications(USER_ID, {
					fetchNotifications,
					getActiveAlerts,
					getKeyPrice,
					markAlertTriggered,
				}),
			{ wrapper: makeWrapper() }
		);

		await waitFor(() => expect(result.current.isLoading).toBe(false));

		expect(result.current.notifications.length).toBe(1);
		const notif = result.current.notifications[0];
		expect(notif.type).toBe('price_alert');
		expect(notif.message).toContain('Beta Key');
		expect(notif.message).toContain('below target price (1 ETH)');
		expect(notif.message).toContain('current price is 0.95 ETH');
		expect(markAlertTriggered).toHaveBeenCalledWith('alert_2');
	});

	it('does not trigger notification when price has not crossed target threshold', async () => {
		const activeAlerts: PriceAlert[] = [
			{
				id: 'alert_3',
				userId: USER_ID,
				keyId: 'key_gamma',
				keyName: 'Gamma Key',
				targetPrice: 5.0,
				direction: 'above',
			},
		];

		const getActiveAlerts = vi.fn().mockResolvedValue(activeAlerts);
		const getKeyPrice = vi.fn().mockResolvedValue(4.2); // 4.2 < 5.0 (not crossed)
		const markAlertTriggered = vi.fn().mockResolvedValue(undefined);
		const fetchNotifications = vi.fn().mockResolvedValue({
			notifications: [],
			unreadCount: 0,
		} as NotificationsResponse);

		const { result } = renderHook(
			() =>
				useNotifications(USER_ID, {
					fetchNotifications,
					getActiveAlerts,
					getKeyPrice,
					markAlertTriggered,
				}),
			{ wrapper: makeWrapper() }
		);

		await waitFor(() => expect(result.current.isLoading).toBe(false));

		expect(result.current.notifications.length).toBe(0);
		expect(result.current.unreadCount).toBe(0);
		expect(markAlertTriggered).not.toHaveBeenCalled();
	});

	it('prevents duplicate notifications for already triggered alerts in checkPriceAlerts', async () => {
		const triggeredSet = new Set<string>();
		const activeAlerts: PriceAlert[] = [
			{
				id: 'alert_dup',
				userId: USER_ID,
				keyId: 'key_delta',
				keyName: 'Delta Key',
				targetPrice: 1.5,
				direction: 'above',
			},
		];

		const getActiveAlerts = vi.fn().mockResolvedValue(activeAlerts);
		const getKeyPrice = vi.fn().mockResolvedValue(1.8);
		const markAlertTriggered = vi.fn().mockResolvedValue(undefined);

		// First poll: crosses threshold
		const firstRun = await checkPriceAlerts(USER_ID, {
			getActiveAlerts,
			getKeyPrice,
			markAlertTriggered,
			triggeredSet,
		});

		expect(firstRun.length).toBe(1);
		expect(markAlertTriggered).toHaveBeenCalledTimes(1);

		// Second poll (e.g. 60s later): same alert must be ignored (no duplicate)
		const secondRun = await checkPriceAlerts(USER_ID, {
			getActiveAlerts,
			getKeyPrice,
			markAlertTriggered,
			triggeredSet,
		});

		expect(secondRun.length).toBe(0);
		expect(markAlertTriggered).toHaveBeenCalledTimes(1); // still only 1
	});
});
