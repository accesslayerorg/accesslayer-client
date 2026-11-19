import { describe, expect, it, vi, beforeEach } from 'vitest';
import { alertService, type PriceAlert } from '@/services/alert.service';
import {
	processPriceAlerts,
	clearTriggeredAlertsCache,
	type Notification,
} from '@/services/notification.service';
import { courseService, type Course } from '@/services/course.service';
import { STROOPS_PER_XLM } from '@/constants/stellar';

vi.mock('@/services/alert.service', async (importOriginal) => {
	const original = await importOriginal<typeof import('@/services/alert.service')>();
	return {
		...original,
		alertService: {
			...original.alertService,
			getActiveAlerts: vi.fn(),
			markAlertTriggered: vi.fn(),
		},
	};
});

vi.mock('@/services/course.service', async (importOriginal) => {
	const original = await importOriginal<typeof import('@/services/course.service')>();
	return {
		...original,
		courseService: {
			...original.courseService,
			getCourse: vi.fn(),
		},
	};
});

const mockGetActiveAlerts = vi.mocked(alertService.getActiveAlerts);
const mockMarkAlertTriggered = vi.mocked(alertService.markAlertTriggered);
const mockGetCourse = vi.mocked(courseService.getCourse);

describe('Price Alert Notifications', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearTriggeredAlertsCache();
	});

	it('creates a price_alert notification and marks alert as triggered when price crosses "above" target', async () => {
		const mockAlert: PriceAlert = {
			id: 'alert-1',
			userId: 'user-123',
			keyId: 'key-alpha',
			keyName: 'Alpha Key',
			targetPrice: 2.5,
			direction: 'above',
			triggered: false,
		};

		const mockCourse: Partial<Course> = {
			id: 'key-alpha',
			title: 'Alpha Key',
			priceStroops: 3.0 * STROOPS_PER_XLM, // 3.0 XLM >= 2.5 XLM target
		};

		mockGetActiveAlerts.mockResolvedValue([mockAlert]);
		mockGetCourse.mockResolvedValue(mockCourse as Course);
		mockMarkAlertTriggered.mockResolvedValue();

		const { newNotifications, triggeredAlertIds } = await processPriceAlerts('user-123', []);

		expect(mockGetActiveAlerts).toHaveBeenCalledWith('user-123');
		expect(mockGetCourse).toHaveBeenCalledWith('key-alpha');

		// Verify backend PATCH /alerts/:alertId/triggered call
		expect(mockMarkAlertTriggered).toHaveBeenCalledWith('alert-1');
		expect(triggeredAlertIds).toContain('alert-1');

		// Verify notification contents: key name, direction, target, and current price
		expect(newNotifications).toHaveLength(1);
		const notif = newNotifications[0];
		expect(notif.type).toBe('price_alert');
		expect(notif.id).toBe('price-alert-alert-1');
		expect(notif.message).toContain('Alpha Key');
		expect(notif.message).toContain('above');
		expect(notif.message).toContain('2.5');
		expect(notif.message).toContain('3');
	});

	it('creates a price_alert notification when price crosses "below" target', async () => {
		const mockAlert: PriceAlert = {
			id: 'alert-2',
			userId: 'user-123',
			keyId: 'key-beta',
			keyName: 'Beta Key',
			targetPrice: 5.0,
			direction: 'below',
			triggered: false,
		};

		const mockCourse: Partial<Course> = {
			id: 'key-beta',
			title: 'Beta Key',
			priceStroops: 4.2 * STROOPS_PER_XLM, // 4.2 XLM <= 5.0 XLM target
		};

		mockGetActiveAlerts.mockResolvedValue([mockAlert]);
		mockGetCourse.mockResolvedValue(mockCourse as Course);
		mockMarkAlertTriggered.mockResolvedValue();

		const { newNotifications } = await processPriceAlerts('user-123', []);

		expect(mockMarkAlertTriggered).toHaveBeenCalledWith('alert-2');
		expect(newNotifications).toHaveLength(1);
		const notif = newNotifications[0];
		expect(notif.type).toBe('price_alert');
		expect(notif.message).toContain('Beta Key');
		expect(notif.message).toContain('below');
		expect(notif.message).toContain('5');
		expect(notif.message).toContain('4.2');
	});

	it('does not trigger a notification if threshold is not crossed', async () => {
		const mockAlert: PriceAlert = {
			id: 'alert-3',
			userId: 'user-123',
			keyId: 'key-gamma',
			keyName: 'Gamma Key',
			targetPrice: 10.0,
			direction: 'above',
			triggered: false,
		};

		const mockCourse: Partial<Course> = {
			id: 'key-gamma',
			title: 'Gamma Key',
			priceStroops: 8.0 * STROOPS_PER_XLM, // 8.0 XLM < 10.0 XLM target
		};

		mockGetActiveAlerts.mockResolvedValue([mockAlert]);
		mockGetCourse.mockResolvedValue(mockCourse as Course);

		const { newNotifications } = await processPriceAlerts('user-123', []);

		expect(mockMarkAlertTriggered).not.toHaveBeenCalled();
		expect(newNotifications).toHaveLength(0);
	});

	it('prevents duplicate notifications for the same alert on subsequent polls', async () => {
		const mockAlert: PriceAlert = {
			id: 'alert-4',
			userId: 'user-123',
			keyId: 'key-delta',
			keyName: 'Delta Key',
			targetPrice: 1.0,
			direction: 'above',
			triggered: false,
		};

		const mockCourse: Partial<Course> = {
			id: 'key-delta',
			title: 'Delta Key',
			priceStroops: 2.0 * STROOPS_PER_XLM,
		};

		mockGetActiveAlerts.mockResolvedValue([mockAlert]);
		mockGetCourse.mockResolvedValue(mockCourse as Course);
		mockMarkAlertTriggered.mockResolvedValue();

		// Poll 1
		const firstPoll = await processPriceAlerts('user-123', []);
		expect(firstPoll.newNotifications).toHaveLength(1);
		expect(mockMarkAlertTriggered).toHaveBeenCalledTimes(1);

		// Poll 2 with existing notifications
		const existingNotifications: Notification[] = firstPoll.newNotifications;
		const secondPoll = await processPriceAlerts('user-123', existingNotifications);

		// No duplicate notification should be generated
		expect(secondPoll.newNotifications).toHaveLength(0);
		expect(mockMarkAlertTriggered).toHaveBeenCalledTimes(1);
	});
});
