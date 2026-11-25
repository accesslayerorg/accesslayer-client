import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useProfileStore } from '@/hooks/useProfileStore';
import { queryKeys } from '@/lib/queryKeys';
import * as notificationServiceModule from '@/services/notification.service';
import type {
	FetchNotificationsOptions,
	Notification,
	NotificationFilterValue,
	NotificationsPage,
	NotificationsResponse,
} from '@/services/notification.service';

const LEGACY_MAX_NOTIFICATIONS = 5;
const POPOVER_MAX_NOTIFICATIONS = 10;
const DEFAULT_PAGE_SIZE = 20;

export const NOTIFICATION_REFETCH_INTERVAL_MS = 30_000;

type NotificationsFetchResult =
	| NotificationsResponse
	| NotificationsPage
	| Notification[];

export type NotificationsFetcher = (
	userId: string,
	options?: FetchNotificationsOptions
) => Promise<NotificationsFetchResult>;

export interface UseNotificationsOptions {
	userId?: string;
	type?: NotificationFilterValue;
	types?: NotificationFilterValue[];
	filter?: NotificationFilterValue;
	pageSize?: number;
	refetchInterval?: number;
	fetcher?: NotificationsFetcher;
	fetchNotifications?: NotificationsFetcher;
	fetchMentions?: NotificationsFetcher;
	fetchOrders?: NotificationsFetcher;
	fetchGifts?: NotificationsFetcher;
}

export interface UseNotificationsResult {
	notifications: Notification[];
	recent: Notification[];
	latest: Notification[];
	popoverNotifications: Notification[];
	unreadCount: number;
	isLoading: boolean;
	isError: boolean;
	error: unknown;
	markAsRead: (notificationId: string) => void;
	markAllAsRead: () => void;
	markNotificationRead: (notificationId: string) => void;
	markAllNotificationsRead: () => void;
	fetchNextPage: () => Promise<void>;
	loadMore: () => Promise<void>;
	hasNextPage: boolean;
	isFetchingNextPage: boolean;
	isMarkingAsRead: boolean;
	isMarkingAllAsRead: boolean;
	refetch: () => void;
}

const getModuleExport = <T,>(name: string): T | undefined => {
	try {
		return (
			notificationServiceModule as unknown as Record<string, T | undefined>
		)[name];
	} catch {
		return undefined;
	}
};

const getFirstModuleExport = <T,>(names: string[]): T | undefined => {
	for (const name of names) {
		const value = getModuleExport<T>(name);
		if (value) return value;
	}
	return undefined;
};

const service = getModuleExport<
	typeof notificationServiceModule.notificationService
>('notificationService');

function timestampOf(value: unknown): number {
	if (value == null) return 0;
	const date = value instanceof Date ? value : new Date(String(value));
	const time = date.getTime();
	return Number.isNaN(time) ? 0 : time;
}

function sortNewestFirst(items: Notification[]): Notification[] {
	return [...items].sort(
		(a, b) =>
			timestampOf(b.createdAt ?? b.timestamp) -
			timestampOf(a.createdAt ?? a.timestamp)
	);
}

function localNormalizeNotification(
	raw: unknown,
	fallbackType: Notification['type']
): Notification | null {
	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
	const source = raw as Record<string, unknown>;
	const value = (keys: string[]) => {
		for (const key of keys) {
			if (source[key] != null) return source[key];
		}
		return undefined;
	};
	const readValue = value(['read', 'isRead', 'is_read', 'seen']);
	const timestamp = value([
		'createdAt',
		'created_at',
		'timestamp',
		'receivedAt',
		'received_at',
	]);
	const createdAt =
		timestamp instanceof Date
			? timestamp.toISOString()
			: typeof timestamp === 'number'
				? new Date(timestamp < 1e12 ? timestamp * 1000 : timestamp).toISOString()
				: String(timestamp ?? new Date().toISOString());
	const type = String(value(['type', 'kind', 'eventType']) ?? fallbackType)
		.toLowerCase()
		.includes('gift')
		? 'gift'
		: String(value(['type', 'kind', 'eventType']) ?? fallbackType)
				.toLowerCase()
				.includes('order')
			? 'order'
			: String(value(['type', 'kind', 'eventType']) ?? fallbackType)
					.toLowerCase()
					.includes('mention')
				? 'mention'
				: fallbackType;
	const id = String(
		value(['id', '_id', 'notificationId', 'notification_id']) ??
			`${type}-${createdAt}`
	);

	return {
		id,
		type,
		message: String(
			value(['message', 'text', 'description', 'body', 'content', 'title']) ??
				'New notification'
		),
		createdAt,
		read:
			typeof readValue === 'boolean'
				? readValue
				: readValue === 'true'
					? true
					: false,
		href: String(
			value(['href', 'url', 'link', 'sourceUrl', 'source_href']) ??
				'/notifications'
		),
		timestamp: createdAt,
		sourceHref: String(
			value(['href', 'url', 'link', 'sourceUrl', 'source_href']) ??
				'/notifications'
		),
	};
}

function normalizeNotification(
	raw: unknown,
	fallbackType: Notification['type']
): Notification | null {
	const normalizer =
		getFirstModuleExport<typeof normalizeNotification>([
			'normalizeNotification',
			'toNotification',
		]) ?? localNormalizeNotification;
	return normalizer(raw, fallbackType);
}

function normalizeResult(
	result: NotificationsFetchResult | unknown,
	fallbackType: Notification['type'] = 'mention'
): NotificationsPage {
	if (Array.isArray(result)) {
		const notifications = sortNewestFirst(
			result
				.map(item => normalizeNotification(item, fallbackType))
				.filter((item): item is Notification => item !== null)
		);
		return {
			notifications,
			unreadCount: notifications.filter(item => !item.read).length,
			nextPage: null,
			hasMore: false,
		};
	}

	const normalizeResponse = getFirstModuleExport<
		(value: unknown) => NotificationsPage
	>(['normalizeNotificationsResponse', 'normalizeNotificationResponse']);
	if (normalizeResponse) {
		return normalizeResponse(result);
	}

	const source = (result ?? {}) as Partial<NotificationsResponse> & {
		unread?: number;
		nextPage?: number | null;
		hasMore?: boolean;
	};
	const notifications = sortNewestFirst(
		(source.notifications ?? [])
			.map(item => normalizeNotification(item, fallbackType))
			.filter((item): item is Notification => item !== null)
	);
	return {
		notifications,
		unreadCount:
			source.unreadCount ??
			source.unread ??
			notifications.filter(item => !item.read).length,
		nextPage: source.nextPage ?? null,
		hasMore: source.hasMore ?? source.nextPage != null,
	};
}

function dedupeById(items: Notification[]): Notification[] {
	const seen = new Set<string>();
	return items.filter(item => {
		if (seen.has(item.id)) return false;
		seen.add(item.id);
		return true;
	});
}

function emptyPage(): NotificationsPage {
	return { notifications: [], unreadCount: 0, nextPage: null, hasMore: false };
}

export function useNotifications(
	userIdOrOptions?: string | UseNotificationsOptions | NotificationsFetcher,
	optionsOrFetcher: UseNotificationsOptions | NotificationsFetcher = {}
): UseNotificationsResult {
	const storedUserId = useProfileStore(state => state.profile?.id ?? '');
	let explicitUserId: string | undefined;
	let options: UseNotificationsOptions;

	if (typeof userIdOrOptions === 'function') {
		options =
			typeof optionsOrFetcher === 'function'
				? { fetcher: optionsOrFetcher }
				: optionsOrFetcher ?? {};
		options.fetcher = userIdOrOptions;
	} else if (userIdOrOptions && typeof userIdOrOptions === 'object') {
		options = userIdOrOptions;
		explicitUserId = options.userId;
	} else {
		explicitUserId = userIdOrOptions;
		options =
			typeof optionsOrFetcher === 'function'
				? { fetcher: optionsOrFetcher }
				: optionsOrFetcher ?? {};
	}

	const userId = explicitUserId ?? options.userId ?? storedUserId;
	const activeFilter =
		options.type ??
		options.filter ??
		(options.types?.length === 1 ? options.types[0] : 'all');
	const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
	const refetchInterval = options.refetchInterval ?? NOTIFICATION_REFETCH_INTERVAL_MS;
	const queryClient = useQueryClient();
	const queryKey = queryKeys.notifications.list(userId);
	const [isLoadingMore, setIsLoadingMore] = useState(false);

	const fetcher = useCallback<NotificationsFetcher>(
		async (id, params) => {
			if (options.fetcher) return options.fetcher(id, params);
			if (options.fetchNotifications) {
				return options.fetchNotifications(id, params);
			}

			const aggregate = getFirstModuleExport<
				(options: FetchNotificationsOptions) => Promise<NotificationsFetchResult>
			>(['fetchNotificationsPage', 'fetchNotifications']);
			if (typeof aggregate === 'function') {
				return aggregate({
					userId: id,
					page: params?.page ?? 1,
					pageSize: params?.pageSize ?? pageSize,
					type: params?.type ?? activeFilter,
				});
			}

			const requestOptions: FetchNotificationsOptions = {
				userId: id,
				page: params?.page ?? 1,
				pageSize: params?.pageSize ?? pageSize,
				type: params?.type ?? activeFilter,
			};
			type SourceFetcher = (
				id: string,
				page: number,
				pageSize: number
			) => Promise<unknown>;
			const moduleFetchMentions = getFirstModuleExport<SourceFetcher>([
				'fetchMentions',
				'fetchMentionNotifications',
				'getMentions',
			]);
			const moduleFetchOrders = getFirstModuleExport<SourceFetcher>([
				'fetchOrders',
				'fetchOrderNotifications',
				'getExecutableOrders',
				'getOrders',
			]);
			const moduleFetchGifts = getFirstModuleExport<SourceFetcher>([
				'fetchGifts',
				'fetchGiftNotifications',
				'getReceivedGifts',
				'getGifts',
			]);
			const sources: Array<{
				fetch: (() => Promise<unknown>) | undefined;
				type: Notification['type'];
			}> = [
				{
					fetch: options.fetchMentions
						? () => options.fetchMentions!(id, requestOptions)
						: moduleFetchMentions
							? () =>
									moduleFetchMentions(
										id,
										requestOptions.page ?? 1,
										requestOptions.pageSize ?? pageSize
									)
							: undefined,
					type: 'mention',
				},
				{
					fetch: options.fetchOrders
						? () => options.fetchOrders!(id, requestOptions)
						: moduleFetchOrders
							? () =>
									moduleFetchOrders(
										id,
										requestOptions.page ?? 1,
										requestOptions.pageSize ?? pageSize
									)
							: undefined,
					type: 'order',
				},
				{
					fetch: options.fetchGifts
						? () => options.fetchGifts!(id, requestOptions)
						: moduleFetchGifts
							? () =>
									moduleFetchGifts(
										id,
										requestOptions.page ?? 1,
										requestOptions.pageSize ?? pageSize
									)
							: undefined,
					type: 'gift',
				},
			];

			const results = await Promise.allSettled(
				sources.filter(source => source.fetch).map(source => source.fetch!())
			);
			const collected: Notification[] = [];
			results.forEach((result, index) => {
				if (result.status !== 'fulfilled') return;
				const type = sources.filter(source => source.fetch)[index]!.type;
				if (Array.isArray(result.value)) {
					for (const item of result.value) {
						const normalized = normalizeNotification(item, type);
						if (normalized) collected.push(normalized);
					}
				} else {
					const page = normalizeResult(result.value, type);
					collected.push(...page.notifications);
				}
			});

			let legacy: NotificationsResponse | null = null;
			if (service?.getNotifications) {
				try {
					legacy = (await service.getNotifications(id)) ?? null;
				} catch {
					legacy = null;
				}
			}
			const notifications = sortNewestFirst(
				dedupeById([
					...collected,
					...(legacy?.notifications ?? []).map(item =>
						normalizeNotification(item, item.type)
					).filter((item): item is Notification => item !== null),
				])
			);

			return {
				notifications,
				unreadCount:
					legacy?.unreadCount ?? notifications.filter(item => !item.read).length,
				nextPage: null,
				hasMore: false,
			};
		},
		[activeFilter, options, pageSize]
	);

	const { data, isLoading, isError, error, refetch } = useQuery({
		queryKey,
		queryFn: async () =>
			normalizeResult(
				await fetcher(userId, {
					userId,
					page: 1,
					pageSize,
					type: activeFilter,
				})
			),
		enabled: !!userId,
		refetchInterval,
	});

	const notifications = useMemo(
		() => sortNewestFirst(dedupeById(data?.notifications ?? [])),
		[data]
	);
	const recent = useMemo(
		() => notifications.slice(0, LEGACY_MAX_NOTIFICATIONS),
		[notifications]
	);
	const latest = useMemo(
		() => notifications.slice(0, POPOVER_MAX_NOTIFICATIONS),
		[notifications]
	);
	const unreadCount =
		data?.unreadCount ?? notifications.filter(item => !item.read).length;
	const hasNextPage = Boolean(data?.hasMore || (data?.nextPage ?? null) != null);

	const updateEveryNotificationCache = useCallback(
		(
			update: (page: NotificationsPage) => NotificationsPage
		): Map<string, NotificationsPage | undefined> => {
			const queries = queryClient.getQueriesData<NotificationsPage>({
				queryKey: queryKeys.notifications.all(),
			});
			const previous = new Map<string, NotificationsPage | undefined>();
			for (const [key, value] of queries) {
				previous.set(JSON.stringify(key), value);
			}
			queryClient.setQueriesData<NotificationsPage>(
				{ queryKey: queryKeys.notifications.all() },
				old => (old ? update(old) : old)
			);
			return previous;
		},
		[queryClient]
	);

	const restoreNotificationCaches = useCallback(
		(previous: Map<string, NotificationsPage | undefined>) => {
			for (const [key, value] of previous) {
				queryClient.setQueryData(
					JSON.parse(key) as readonly unknown[],
					value
				);
			}
		},
		[queryClient]
	);

	const markAsReadMutation = useMutation({
		mutationFn: (notificationId: string) => {
			const markRead = getFirstModuleExport<(id: string) => Promise<void>>([
				'markNotificationRead',
				'markNotificationAsRead',
				'markAsRead',
			]);
			if (markRead) return markRead(notificationId);
			return service!.markAsRead(notificationId);
		},
		onMutate: async (notificationId: string) => {
			await queryClient.cancelQueries({ queryKey });
			const previous = updateEveryNotificationCache(page => {
				const target = page.notifications.find(
					item => item.id === notificationId
				);
				const shouldDecrement = target ? !target.read : page.unreadCount > 0;
				return {
					...page,
					notifications: page.notifications.map(item =>
						item.id === notificationId ? { ...item, read: true } : item
					),
					unreadCount: shouldDecrement
						? Math.max(0, page.unreadCount - 1)
						: page.unreadCount,
				};
			});
			return { previous };
		},
		onError: (_error, _id, context) => {
			if (context?.previous) restoreNotificationCaches(context.previous);
		},
		onSettled: () => {
			void queryClient.invalidateQueries({
				queryKey: queryKeys.notifications.all(),
			});
		},
	});

	const markAllAsReadMutation = useMutation({
		mutationFn: () => {
			const markAllRead = getFirstModuleExport<
				(id: string) => Promise<void>
			>(['markAllNotificationsRead', 'markAllAsRead']);
			if (markAllRead) return markAllRead(userId);
			return service!.markAllAsRead(userId);
		},
		onMutate: async () => {
			await queryClient.cancelQueries({ queryKey });
			const previous = updateEveryNotificationCache(page => ({
				...page,
				notifications: page.notifications.map(item => ({
					...item,
					read: true,
				})),
				unreadCount: 0,
			}));
			return { previous };
		},
		onError: (_error, _variables, context) => {
			if (context?.previous) restoreNotificationCaches(context.previous);
		},
		onSettled: () => {
			void queryClient.invalidateQueries({
				queryKey: queryKeys.notifications.all(),
			});
		},
	});

	const fetchNextPage = useCallback(async () => {
		if (!userId || !hasNextPage || isLoadingMore) return;
		const nextPage = data?.nextPage ?? (data?.hasMore ? 2 : null);
		if (nextPage == null) return;

		setIsLoadingMore(true);
		try {
			const result = normalizeResult(
				await fetcher(userId, {
					userId,
					page: nextPage,
					pageSize,
					type: activeFilter,
				})
			);
			queryClient.setQueryData<NotificationsPage>(queryKey, old => {
				const previous = old ?? emptyPage();
				const addedUnread = result.notifications.filter(
					item => !item.read
				).length;
				return {
					notifications: sortNewestFirst(
						dedupeById([
							...previous.notifications,
							...result.notifications,
						])
					),
					unreadCount:
						result.unreadCount ?? previous.unreadCount + addedUnread,
					nextPage: result.nextPage ?? null,
					hasMore: result.hasMore ?? result.nextPage != null,
				};
			});
		} finally {
			setIsLoadingMore(false);
		}
	}, [
		activeFilter,
		data?.hasMore,
		data?.nextPage,
		fetcher,
		hasNextPage,
		isLoadingMore,
		pageSize,
		queryClient,
		queryKey,
		userId,
	]);

	const markAsRead = markAsReadMutation.mutate;
	const markAllAsRead = markAllAsReadMutation.mutate;

	return {
		notifications,
		recent,
		latest,
		popoverNotifications: latest,
		unreadCount,
		isLoading,
		isError,
		error,
		markAsRead,
		markAllAsRead,
		markNotificationRead: markAsRead,
		markAllNotificationsRead: markAllAsRead,
		fetchNextPage,
		loadMore: fetchNextPage,
		hasNextPage,
		isFetchingNextPage: isLoadingMore,
		isMarkingAsRead: markAsReadMutation.isPending,
		isMarkingAllAsRead: markAllAsReadMutation.isPending,
		refetch: () => void refetch(),
	};
}

export default useNotifications;
