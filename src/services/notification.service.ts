import { BaseApiService, type APIResponse } from './api.service';
import { alertService } from './alert.service';
import { courseService } from './course.service';
import { STROOPS_PER_XLM } from '@/constants/stellar';

/** The kind of event that generated a notification. */
export type NotificationType =
	| 'trade_completed'
	| 'lockup_expiring'
	| 'price_moved'
	| 'new_follower'
	| 'key_purchase'
	| 'price_milestone'
	| 'price_alert'
	| 'mention'
	| 'order'
	| 'gift';

export type NotificationFilterValue = 'all' | 'mention' | 'order' | 'gift';

export const NOTIFICATION_FILTERS = [
	{ value: 'all', label: 'All' },
	{ value: 'mention', label: 'Mentions' },
	{ value: 'order', label: 'Orders' },
	{ value: 'gift', label: 'Gifts' },
] as const;

/** A single notification entry returned from the API. */
export interface Notification {
	id: string;
	type: NotificationType;
	message: string;
	/** ISO 8601 timestamp when the notification was created. */
	createdAt: string;
	read: boolean;
	/** Client-side path to navigate to when this notification is clicked. */
	href: string;
	title?: string;
	timestamp?: string | number;
	sourceId?: string;
	sourceHref?: string;
}

/** Shape of the API response for a notifications list request. */
export interface NotificationsResponse {
	notifications: Notification[];
	unreadCount: number;
}

export interface NotificationsPage extends NotificationsResponse {
	nextPage?: number | null;
	hasMore?: boolean;
}

export interface FetchNotificationsOptions {
	userId: string;
	page?: number;
	pageSize?: number;
	type?: NotificationFilterValue;
}

export type NotificationItem = Notification;
export type NotificationKind = NotificationType;
export type NotificationFilter = NotificationFilterValue;

type UnknownRecord = Record<string, unknown>;

interface EndpointPage {
	items: unknown[];
	nextPage: number | null;
}

function asRecord(value: unknown): UnknownRecord | null {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
	return value as UnknownRecord;
}

function firstValue(source: UnknownRecord, keys: string[]): unknown {
	for (const key of keys) {
		if (source[key] != null) return source[key];
	}
	return undefined;
}

function firstString(source: UnknownRecord, keys: string[]): string | undefined {
	const value = firstValue(source, keys);
	return value == null ? undefined : String(value);
}

function firstBoolean(source: UnknownRecord, keys: string[]): boolean | undefined {
	const value = firstValue(source, keys);
	if (typeof value === 'boolean') return value;
	if (value === 'true') return true;
	if (value === 'false') return false;
	if (typeof value === 'number') return value !== 0;
	return undefined;
}

function toTimestamp(value: unknown): string {
	if (value == null) return new Date().toISOString();
	if (value instanceof Date) return value.toISOString();
	if (typeof value === 'number') {
		const date = new Date(value < 1e12 ? value * 1000 : value);
		return Number.isNaN(date.getTime())
			? new Date().toISOString()
			: date.toISOString();
	}
	const date = new Date(String(value));
	return Number.isNaN(date.getTime())
		? new Date().toISOString()
		: date.toISOString();
}

function inferType(value: unknown, fallback: NotificationType): NotificationType {
	const raw = String(value ?? '')
		.toLowerCase()
		.replace(/[\s-]+/g, '_');

	if (!raw) return fallback;
	if (raw.includes('mention') || raw.includes('comment')) return 'mention';
	if (raw.includes('order')) return 'order';
	if (raw.includes('gift')) return 'gift';
	if (raw === 'trade_completed' || raw === 'trade') return 'trade_completed';
	if (raw === 'lockup_expiring' || raw === 'lockup') return 'lockup_expiring';
	if (raw === 'price_moved') return 'price_moved';
	if (raw === 'new_follower' || raw === 'follow') return 'new_follower';
	if (raw === 'key_purchase' || raw === 'purchase') return 'key_purchase';
	if (raw === 'price_milestone') return 'price_milestone';
	if (raw === 'price_alert') return 'price_alert';
	return fallback;
}

function buildMessage(
	source: UnknownRecord,
	type: NotificationType,
	fallback: string
): string {
	const direct = firstString(source, [
		'message',
		'text',
		'description',
		'content',
		'body',
	]);
	if (direct) return direct;

	const title = firstString(source, ['title', 'headline', 'name']);
	if (title) return title;

	const sender =
		firstString(source, ['fromName', 'senderName', 'actorName', 'username']) ??
		firstString(source, ['from', 'sender', 'actor']) ??
		'someone';

	if (type === 'mention') {
		return `${sender} mentioned you in a comment`;
	}
	if (type === 'order') {
		return firstString(source, ['status'])
			? `Your order is ${firstString(source, ['status'])} and ready to execute`
			: 'You have an order ready to execute';
	}
	if (type === 'gift') {
		const quantity = Number(firstValue(source, ['quantity', 'amount']) ?? 1);
		const keyName =
			firstString(source, ['keyName', 'creatorName', 'assetName']) ?? 'key';
		return `${sender} sent you ${quantity} ${keyName}${quantity === 1 ? '' : 's'}`;
	}
	return fallback;
}

function buildHref(
	source: UnknownRecord,
	type: NotificationType,
	id: string
): string {
	const direct = firstString(source, [
		'href',
		'url',
		'link',
		'sourceUrl',
		'source_href',
		'target',
	]);
	if (direct) return direct;

	const commentId = firstString(source, ['commentId', 'comment_id']);
	const creatorId = firstString(source, [
		'keyId',
		'creatorId',
		'creator_id',
		'key_id',
	]);
	const orderId = firstString(source, ['orderId', 'order_id']);
	const giftId = firstString(source, ['giftId', 'gift_id']);

	if (type === 'mention') {
		if (creatorId) {
			return commentId
				? `/creator/${creatorId}?comment=${commentId}`
				: `/creator/${creatorId}`;
		}
		return commentId ? `/comments/${commentId}` : '/notifications';
	}
	if (type === 'order') {
		if (orderId) return `/orders/${orderId}`;
		return creatorId ? `/keys/${creatorId}` : '/transactions';
	}
	if (type === 'gift') {
		if (giftId) return `/profile?gift=${giftId}`;
		return creatorId ? `/keys/${creatorId}?gift=${id}` : '/profile?gift';
	}
	return '/notifications';
}

export function normalizeNotification(
	raw: unknown,
	fallbackType: NotificationType = 'mention'
): Notification | null {
	const source = asRecord(raw);
	if (!source) return null;

	const nested = asRecord(firstValue(source, ['notification', 'data', 'event']));
	const merged: UnknownRecord = { ...source, ...(nested ?? {}) };
	const type = inferType(
		firstValue(merged, ['type', 'kind', 'eventType', 'category']),
		fallbackType
	);
	const id =
		firstString(merged, ['id', '_id', 'notificationId', 'notification_id']) ??
		`${type}-${toTimestamp(
			firstValue(merged, ['createdAt', 'timestamp', 'created_at', 'receivedAt'])
		)}`;

	const createdAt = toTimestamp(
		firstValue(merged, [
			'createdAt',
			'created_at',
			'timestamp',
			'receivedAt',
			'received_at',
			'date',
			'time',
		])
	);
	const href = buildHref(merged, type, id);
	const message = buildMessage(merged, type, 'New notification');

	return {
		id,
		type,
		message,
		createdAt,
		read:
			firstBoolean(merged, ['read', 'isRead', 'is_read', 'seen']) ?? false,
		href,
		title: firstString(merged, ['title', 'headline']),
		timestamp: createdAt,
		sourceId:
			firstString(merged, [
				'commentId',
				'orderId',
				'giftId',
				'notificationId',
				'id',
			]) ?? id,
		sourceHref: href,
	};
}

export function normalizeNotificationsResponse(
	value: unknown,
	fallbackType: NotificationType = 'mention'
): NotificationsPage {
	if (Array.isArray(value)) {
		const notifications = value
			.map(item => normalizeNotification(item, fallbackType))
			.filter((item): item is Notification => item !== null);
		return {
			notifications,
			unreadCount: notifications.filter(item => !item.read).length,
			nextPage: null,
			hasMore: false,
		};
	}

	const source = asRecord(value);
	if (!source) return { notifications: [], unreadCount: 0, nextPage: null };

	const itemsValue = firstValue(source, [
		'notifications',
		'items',
		'results',
		'data',
		'mentions',
		'orders',
		'gifts',
		'events',
	]);
	const items = Array.isArray(itemsValue) ? itemsValue : [];
	const notifications = items
		.map(item => normalizeNotification(item, fallbackType))
		.filter((item): item is Notification => item !== null);
	const unread = firstValue(source, ['unreadCount', 'unread_count']);
	const nextPageValue = firstValue(source, ['nextPage', 'next_page', 'cursor']);

	return {
		notifications,
		unreadCount:
			typeof unread === 'number'
				? unread
				: notifications.filter(item => !item.read).length,
		nextPage:
			typeof nextPageValue === 'number'
				? nextPageValue
				: nextPageValue
					? 1
					: null,
		hasMore:
			firstBoolean(source, ['hasMore', 'has_more']) ??
			(nextPageValue != null),
	};
}

export function getNotificationTimestamp(notification: Notification): string {
	return notification.createdAt ?? String(notification.timestamp ?? '');
}

export function getNotificationHref(notification: Notification): string {
	return notification.href ?? notification.sourceHref ?? '/notifications';
}

export function getNotificationType(notification: Notification): NotificationType {
	return inferType(notification.type, 'mention');
}

function extractEndpointPage(
	payload: unknown,
	currentPage: number,
	arrayKeys: string[]
): EndpointPage {
	if (Array.isArray(payload)) return { items: payload, nextPage: null };

	const source = asRecord(payload);
	if (!source) return { items: [], nextPage: null };

	let items: unknown[] = [];
	for (const key of arrayKeys) {
		const candidate = source[key];
		if (Array.isArray(candidate)) {
			items = candidate;
			break;
		}
		const nested = asRecord(candidate);
		if (nested) {
			for (const nestedKey of arrayKeys) {
				if (Array.isArray(nested[nestedKey])) {
					items = nested[nestedKey] as unknown[];
					break;
				}
			}
			if (items.length > 0) break;
		}
	}

	const nextPageValue = firstValue(source, ['nextPage', 'next_page', 'cursor']);
	const hasMore =
		firstBoolean(source, ['hasMore', 'has_more']) ?? nextPageValue != null;
	const nextPage =
		typeof nextPageValue === 'number'
			? nextPageValue
			: nextPageValue
				? currentPage + 1
				: hasMore
					? currentPage + 1
					: null;

	return { items, nextPage };
}

// In-memory cache of triggered alert IDs to avoid duplicate notifications within session
const triggeredAlertIdsCache = new Set<string>();

export function clearTriggeredAlertsCache(): void {
	triggeredAlertIdsCache.clear();
}

export async function processPriceAlerts(
	userId: string,
	existingNotifications: Notification[] = []
): Promise<{ newNotifications: Notification[]; triggeredAlertIds: string[] }> {
	if (!userId) return { newNotifications: [], triggeredAlertIds: [] };

	try {
		const activeAlerts = await alertService.getActiveAlerts(userId);
		if (!activeAlerts || activeAlerts.length === 0) {
			return { newNotifications: [], triggeredAlertIds: [] };
		}

		const newNotifications: Notification[] = [];
		const triggeredAlertIds: string[] = [];

		for (const alert of activeAlerts) {
			if (alert.triggered) {
				triggeredAlertIdsCache.add(alert.id);
				continue;
			}
			if (triggeredAlertIdsCache.has(alert.id)) {
				continue;
			}
			const notificationId = `price-alert-${alert.id}`;
			if (existingNotifications.some(n => n.id === notificationId || n.id === alert.id)) {
				triggeredAlertIdsCache.add(alert.id);
				continue;
			}

			try {
				const course = await courseService.getCourse(alert.keyId);
				if (!course) continue;

				const currentXlm =
					course.priceStroops != null
						? course.priceStroops / STROOPS_PER_XLM
						: (course.price ?? 0);

				const isStroopsTarget = alert.targetPrice >= 100_000;
				const targetXlm = isStroopsTarget
					? alert.targetPrice / STROOPS_PER_XLM
					: alert.targetPrice;

				const direction = alert.direction;
				const isCrossed =
					(direction === 'above' && currentXlm >= targetXlm) ||
					(direction === 'below' && currentXlm <= targetXlm);

				if (isCrossed) {
					await alertService.markAlertTriggered(alert.id);
					triggeredAlertIdsCache.add(alert.id);
					triggeredAlertIds.push(alert.id);

					const keyName =
						alert.keyName ||
						alert.keyTitle ||
						course.name ||
						course.title ||
						'Key';

					const notification: Notification = {
						id: notificationId,
						type: 'price_alert',
						message: `${keyName} price is now ${currentXlm} XLM (${direction} target of ${targetXlm} XLM)`,
						createdAt: new Date().toISOString(),
						read: false,
						href: `/creator/${alert.keyId}`,
					};

					newNotifications.push(notification);
				}
			} catch (err) {
				console.error(`Error checking price alert ${alert.id}:`, err);
			}
		}

		return { newNotifications, triggeredAlertIds };
	} catch (err) {
		console.error('Error processing price alerts:', err);
		return { newNotifications: [], triggeredAlertIds: [] };
	}
}

class NotificationService extends BaseApiService {
	private async requestEndpoint(
		candidates: Array<{ path: string; params: Record<string, unknown> }>,
		currentPage: number,
		arrayKeys: string[]
	): Promise<EndpointPage> {
		for (const candidate of candidates) {
			try {
				const response = await this.api.get<APIResponse<unknown>>(
					candidate.path,
					{ params: candidate.params }
				);
				return extractEndpointPage(
					response.data?.data ?? response.data,
					currentPage,
					arrayKeys
				);
			} catch (error) {
				const apiError = this.handleError(error);
				if (apiError.status === 404 || apiError.status === 405) continue;
				return { items: [], nextPage: null };
			}
		}
		return { items: [], nextPage: null };
	}

	async getMentions(
		userId: string,
		page = 1,
		pageSize = 20
	): Promise<EndpointPage> {
		return this.requestEndpoint(
			[
				{
					path: '/notifications/mentions',
					params: { userId, page, limit: pageSize },
				},
				{
					path: `/users/${userId}/mentions`,
					params: { page, limit: pageSize },
				},
			],
			page,
			['notifications', 'mentions', 'items', 'results', 'comments', 'data']
		);
	}

	async getOrders(
		userId: string,
		page = 1,
		pageSize = 20
	): Promise<EndpointPage> {
		return this.requestEndpoint(
			[
				{
					path: '/notifications/orders',
					params: { userId, page, limit: pageSize },
				},
				{
					path: `/users/${userId}/orders`,
					params: { page, limit: pageSize },
				},
				{
					path: '/orders/executable',
					params: { userId, page, limit: pageSize },
				},
			],
			page,
			['notifications', 'orders', 'items', 'results', 'data']
		);
	}

	async getGifts(
		userId: string,
		page = 1,
		pageSize = 20
	): Promise<EndpointPage> {
		return this.requestEndpoint(
			[
				{
					path: '/notifications/gifts',
					params: { userId, page, limit: pageSize },
				},
				{
					path: `/wallets/${userId}/gifts`,
					params: { page, limit: pageSize },
				},
			],
			page,
			['notifications', 'gifts', 'items', 'results', 'data']
		);
	}

	/** Fetch the current user's notifications — GET /notifications */
	async getNotifications(userId: string): Promise<NotificationsResponse> {
		try {
			const response = await this.api.get<
				APIResponse<NotificationsResponse>
			>(`/notifications`, { params: { userId } });

			const baseData = response.data?.data ?? { notifications: [], unreadCount: 0 };
			const baseNotifications = baseData.notifications ?? [];

			const { newNotifications } = await processPriceAlerts(userId, baseNotifications);

			if (newNotifications.length > 0) {
				const merged = [...newNotifications, ...baseNotifications];
				const unreadCount = (baseData.unreadCount ?? 0) + newNotifications.length;
				return { notifications: merged, unreadCount };
			}

			return baseData;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	async getNotificationsPage({
		userId,
		page = 1,
		pageSize = 20,
		type = 'all',
	}: FetchNotificationsOptions): Promise<NotificationsPage> {
		const requests: Array<Promise<EndpointPage>> = [];
		if (type === 'all' || type === 'mention') {
			requests.push(this.getMentions(userId, page, pageSize));
		}
		if (type === 'all' || type === 'order') {
			requests.push(this.getOrders(userId, page, pageSize));
		}
		if (type === 'all' || type === 'gift') {
			requests.push(this.getGifts(userId, page, pageSize));
		}

		const results = await Promise.allSettled(requests);
		const collected: Notification[] = [];
		let nextPage: number | null = null;

		for (const result of results) {
			if (result.status !== 'fulfilled') continue;
			const { items, nextPage: pageToken } = result.value;
			for (const item of items) {
				const fallback: NotificationType =
					type === 'all' ? 'mention' : type;
				const normalized = normalizeNotification(item, fallback);
				if (normalized) collected.push(normalized);
			}
			if (pageToken != null) nextPage = pageToken;
		}

		if (page === 1 && collected.length === 0) {
			try {
				const legacy = await this.getNotifications(userId);
				for (const item of legacy.notifications ?? []) {
					const normalized = normalizeNotification(item, item.type);
					if (normalized) collected.push(normalized);
				}
				if (legacy.unreadCount > 0 && collected.length === 0) {
					return { notifications: [], unreadCount: legacy.unreadCount, nextPage: null };
				}
			} catch {
				collected.length = 0;
			}
		}

		let baseNotifications = collected;
		if (page === 1) {
			const { newNotifications } = await processPriceAlerts(
				userId,
				collected
			);
			baseNotifications = [...newNotifications, ...collected];
		}

		const seen = new Set<string>();
		const notifications = baseNotifications
			.filter(item => {
				if (seen.has(item.id)) return false;
				seen.add(item.id);
				return true;
			})
			.sort(
				(a, b) =>
					new Date(getNotificationTimestamp(b)).getTime() -
					new Date(getNotificationTimestamp(a)).getTime()
			);
		const unreadCount = notifications.filter(item => !item.read).length;
		const hasMore = nextPage != null;

		return {
			notifications,
			unreadCount,
			nextPage: hasMore ? nextPage : null,
			hasMore,
		};
	}

	/** Mark a single notification as read — PATCH /notifications/:id/read */
	async markAsRead(notificationId: string): Promise<void> {
		try {
			await this.api.patch(`/notifications/${notificationId}/read`);
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/** Mark all notifications as read — PATCH /notifications/read-all */
	async markAllAsRead(userId: string): Promise<void> {
		try {
			await this.api.patch(`/notifications/read-all`, { userId });
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const notificationService = new NotificationService();

export async function fetchMentions(
	userId: string,
	page = 1,
	pageSize = 20
): Promise<Notification[]> {
	return (await notificationService.getMentions(userId, page, pageSize)).items
		.map(item => normalizeNotification(item, 'mention'))
		.filter((item): item is Notification => item !== null);
}

export async function fetchOrders(
	userId: string,
	page = 1,
	pageSize = 20
): Promise<Notification[]> {
	return (await notificationService.getOrders(userId, page, pageSize)).items
		.map(item => normalizeNotification(item, 'order'))
		.filter((item): item is Notification => item !== null);
}

export async function fetchGifts(
	userId: string,
	page = 1,
	pageSize = 20
): Promise<Notification[]> {
	return (await notificationService.getGifts(userId, page, pageSize)).items
		.map(item => normalizeNotification(item, 'gift'))
		.filter((item): item is Notification => item !== null);
}

export async function fetchReceivedGiftNotifications(
	userId: string,
	page = 1,
	pageSize = 20
): Promise<Notification[]> {
	return fetchGifts(userId, page, pageSize);
}

export async function fetchNotificationsPage(
	options: FetchNotificationsOptions
): Promise<NotificationsPage> {
	return notificationService.getNotificationsPage(options);
}

export async function fetchNotifications(
	options: FetchNotificationsOptions
): Promise<NotificationsPage> {
	return fetchNotificationsPage(options);
}

export async function markNotificationRead(id: string): Promise<void> {
	return notificationService.markAsRead(id);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
	return notificationService.markAllAsRead(userId);
}
