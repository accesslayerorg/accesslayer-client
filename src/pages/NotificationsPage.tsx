import { useState } from 'react';
import {
	AtSign,
	Bell,
	Check,
	Gift,
	ListOrdered,
	ShoppingBag,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import {
	NOTIFICATION_FILTERS,
	getNotificationHref,
	getNotificationTimestamp,
	type NotificationFilterValue,
	type NotificationType,
} from '@/services/notification.service';
import { useNotifications } from '@/hooks/useNotifications';
import { useProfileStore } from '@/hooks/useProfileStore';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useNavigationTiming } from '@/hooks/useNavigationTiming';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/utils/time.utils';

function notificationType(type: NotificationType): NotificationType {
	const value = String(type ?? '').toLowerCase();
	if (value.includes('mention') || value.includes('comment')) return 'mention';
	if (value.includes('order')) return 'order';
	if (value.includes('gift')) return 'gift';
	return type;
}

function notificationIcon(type: NotificationType) {
	const props = {
		className: 'size-4 shrink-0 text-amber-400',
		'data-testid': `icon-${type}`,
		'aria-hidden': true as const,
	};
	switch (notificationType(type)) {
		case 'mention':
			return <AtSign {...props} className="size-4 shrink-0 text-sky-400" />;
		case 'order':
			return (
				<ListOrdered
					{...props}
					className="size-4 shrink-0 text-emerald-400"
				/>
			);
		case 'gift':
			return <Gift {...props} className="size-4 shrink-0 text-violet-400" />;
		default:
			return <ShoppingBag {...props} />;
	}
}

export default function NotificationsPage() {
	useNavigationTiming('notifications');

	const navigate = useNavigate();
	const profile = useProfileStore(state => state.profile);
	const userId = profile?.id ?? '';
	const [activeFilter, setActiveFilter] =
		useState<NotificationFilterValue>('all');
	const notificationsQuery = useNotifications(userId);
	const {
		notifications,
		recent,
		unreadCount,
		isLoading,
		isError,
		markAsRead,
		markAllAsRead,
		hasNextPage: hasNextPageProp,
		isFetchingNextPage,
		refetch,
	} = notificationsQuery as typeof notificationsQuery & {
		hasMore?: boolean;
		fetchMore?: () => void | Promise<void>;
	};
	const hasNextPage =
		hasNextPageProp ??
		(notificationsQuery as { hasMore?: boolean }).hasMore === true;
	const loadMore =
		notificationsQuery.fetchNextPage ??
		notificationsQuery.loadMore ??
		(notificationsQuery as { fetchMore?: () => void | Promise<void> })
			.fetchMore;

	const items = (() => {
		const seen = new Set<string>();
		const merged = [...(notifications ?? []), ...(recent ?? [])];
		return merged
			.filter(item => {
				if (!item || seen.has(item.id)) return false;
				seen.add(item.id);
				return true;
			})
			.sort(
				(a, b) =>
					new Date(getNotificationTimestamp(b)).getTime() -
					new Date(getNotificationTimestamp(a)).getTime()
			);
	})();
	const visibleItems =
		activeFilter === 'all'
			? items
			: items.filter(item => notificationType(item.type) === activeFilter);

	const sentinelRef = useInfiniteScroll<HTMLDivElement>({
		enabled: !isLoading && !isFetchingNextPage,
		hasMore: Boolean(hasNextPage),
		onLoadMore: () => {
			void loadMore?.();
		},
	});

	const handleNotificationClick = (
		notificationId: string,
		href: string
	) => {
		markAsRead(notificationId);
		void navigate(href);
	};

	return (
		<main className="mx-auto max-w-2xl px-6 py-16">
			<div className="mb-6 flex flex-wrap items-center gap-3">
				<Bell className="size-6 text-foreground" aria-hidden="true" />
				<h1 className="font-jakarta text-2xl font-semibold">Notifications</h1>
				{unreadCount > 0 && (
					<span
						data-testid="notifications-unread-count"
						className="rounded-full bg-red-500/15 px-2.5 py-0.5 text-sm font-semibold text-red-500"
					>
						{unreadCount} unread
					</span>
				)}
				{unreadCount > 0 && (
					<span data-testid="notifications-mark-all-read">
						<button
							type="button"
							data-testid="notification-mark-all-read"
							onClick={() => markAllAsRead()}
							className="text-sm font-semibold text-amber-500 underline-offset-4 transition-colors hover:text-amber-400 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
						>
							Mark all read
						</button>
					</span>
				)}
				<Link
					to="/settings/notifications"
					className="ml-auto text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
				>
					Preferences
				</Link>
			</div>

			<div
				role="tablist"
				aria-label="Filter notifications by type"
				data-testid="notification-filters"
				className="mb-6 flex flex-wrap gap-2 border-b border-border pb-3"
			>
				{NOTIFICATION_FILTERS.map(filter => (
					<span
						key={filter.value}
						data-testid={`notifications-filter-${filter.value}`}
						onClick={() => setActiveFilter(filter.value)}
					>
						<button
							type="button"
							role="tab"
							id={`notification-filter-${filter.value}`}
							aria-selected={activeFilter === filter.value}
							aria-controls="notifications-panel"
							data-testid={`notification-filter-${filter.value}`}
							onClick={() => setActiveFilter(filter.value)}
							className={cn(
								'rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500',
								activeFilter === filter.value
									? 'border-amber-400/40 bg-amber-400/15 text-foreground'
									: 'border-border text-muted-foreground hover:text-foreground'
							)}
						>
							{filter.label}
						</button>
					</span>
				))}
			</div>

			<div id="notifications-panel" role="tabpanel">
				{isLoading && (
					<div
						data-testid="notifications-page-loading"
						className="space-y-3"
					>
						{Array.from({ length: 5 }).map((_, index) => (
							<div
								key={index}
								className="h-16 w-full animate-pulse rounded-xl bg-muted"
							/>
						))}
					</div>
				)}

				{!isLoading && isError && (
					<div
						role="alert"
						data-testid="notifications-page-error"
						className="flex flex-col items-center gap-3 rounded-2xl border border-border py-16 text-center"
					>
						<p className="text-sm text-muted-foreground">
							We couldn&apos;t load your notifications.
						</p>
						<button
							type="button"
							onClick={() => refetch()}
							className="text-sm font-semibold text-amber-500 hover:text-amber-400"
						>
							Try again
						</button>
					</div>
				)}

				{!isLoading && !isError && visibleItems.length === 0 && (
					<div
						data-testid="notifications-page-empty"
						className="flex flex-col items-center gap-3 rounded-2xl border border-border py-16 text-center"
					>
						<div className="flex size-12 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
							<Bell className="size-6" aria-hidden="true" />
						</div>
						<p className="text-sm text-muted-foreground">
							{activeFilter === 'all'
								? 'No notifications yet'
								: `No ${activeFilter} notifications`}
						</p>
					</div>
				)}

				{!isLoading && !isError && visibleItems.length > 0 && (
					<ul
						data-testid="notifications-page-list"
						className="divide-y divide-border rounded-xl border border-border"
					>
						{visibleItems.map(item => (
							<li
								key={item.id}
								className={cn(
									'flex items-center gap-2 pr-2 transition-colors hover:bg-accent/40',
									!item.read && 'bg-accent/20'
								)}
							>
								<Link
									to={getNotificationHref(item)}
									data-testid={`notifications-page-item-${item.id}`}
									aria-label={`${item.message}. ${
										item.read ? 'Read' : 'Unread'
									}. ${formatRelativeTime(
										getNotificationTimestamp(item)
									)}`}
									onClick={event => {
										event.preventDefault();
										handleNotificationClick(
											item.id,
											getNotificationHref(item)
										);
									}}
									className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 px-4 py-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
								>
									{notificationIcon(item.type)}
									{!item.read && (
										<span
											aria-label="Unread"
											className="mt-1.5 size-2 shrink-0 rounded-full bg-blue-500"
										/>
									)}
									<span className={cn('flex-1', item.read && 'pl-4')}>
										<span
											className={cn(
												'block text-sm',
												item.read
													? 'text-muted-foreground'
													: 'font-medium text-foreground'
											)}
										>
											{item.message}
										</span>
										<span className="mt-1 block text-xs text-muted-foreground">
											{formatRelativeTime(
												getNotificationTimestamp(item)
											)}
										</span>
									</span>
								</Link>
								{!item.read && (
									<span
										data-testid={`notification-mark-read-${item.id}`}
										onClick={() => markAsRead(item.id)}
									>
										<button
											type="button"
											aria-label={`Mark "${item.message}" as read`}
											data-testid={`notifications-page-mark-read-${item.id}`}
											onClick={() => markAsRead(item.id)}
											className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
										>
											<Check className="size-4" aria-hidden="true" />
										</button>
									</span>
								)}
							</li>
						))}
					</ul>
				)}

				{hasNextPage && (
					<div
						ref={sentinelRef}
						data-testid="notifications-sentinel"
						aria-hidden="true"
						className="h-px w-full"
					/>
				)}

				{hasNextPage && (
					<div className="mt-6 flex justify-center" data-testid="notifications-page-load-more">
						<button
							type="button"
							data-testid="notifications-load-more"
										onClick={() => void loadMore?.()}
							disabled={isFetchingNextPage}
							className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
						>
							{isFetchingNextPage ? 'Loading…' : 'Load more'}
						</button>
					</div>
				)}
			</div>
		</main>
	);
}
