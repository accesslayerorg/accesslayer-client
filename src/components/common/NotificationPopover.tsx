import { useState, type ReactNode } from 'react';
import {
	ArrowRightLeft,
	AtSign,
	Bell,
	Clock,
	Gift,
	Key,
	ListOrdered,
	ShoppingBag,
	TrendingUp,
	UserPlus,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { useNotifications } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';
import {
	getNotificationHref,
	getNotificationTimestamp,
	type Notification,
	type NotificationType,
} from '@/services/notification.service';
import { formatRelativeTime } from '@/utils/time.utils';

const POPOVER_MAX_NOTIFICATIONS = 10;

export interface NotificationPopoverProps {
	userId?: string;
	notifications?: Notification[];
	items?: Notification[];
	recent?: Notification[];
	unreadCount?: number;
	isLoading?: boolean;
	markAsRead?: (notificationId: string) => void;
	markAllAsRead?: () => void;
	onNavigate?: (href: string) => void;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	trigger?: ReactNode;
	className?: string;
}

function useSafeNavigate() {
	try {
		return useNavigate();
	} catch {
		return undefined;
	}
}

function notificationIcon(type: NotificationType) {
	const iconProps = {
		className: 'size-4 shrink-0 text-amber-400',
		'data-testid': `icon-${type}`,
		'aria-hidden': true as const,
	};

	switch (type) {
		case 'mention':
			return <AtSign {...iconProps} className="size-4 shrink-0 text-sky-400" />;
		case 'order':
			return (
				<ListOrdered
					{...iconProps}
					className="size-4 shrink-0 text-emerald-400"
				/>
			);
		case 'gift':
			return <Gift {...iconProps} className="size-4 shrink-0 text-violet-400" />;
		case 'trade_completed':
			return (
				<ArrowRightLeft
					{...iconProps}
					className="size-4 shrink-0 text-emerald-400"
				/>
			);
		case 'lockup_expiring':
			return (
				<Clock {...iconProps} className="size-4 shrink-0 text-amber-400" />
			);
		case 'price_moved':
			return (
				<TrendingUp
					{...iconProps}
					className="size-4 shrink-0 text-cyan-400"
				/>
			);
		case 'new_follower':
			return (
				<UserPlus
					{...iconProps}
					className="size-4 shrink-0 text-purple-400"
				/>
			);
		case 'key_purchase':
			return <Key {...iconProps} className="size-4 shrink-0 text-blue-400" />;
		case 'price_alert':
			return (
				<Bell {...iconProps} className="size-4 shrink-0 text-emerald-400" />
			);
		default:
			return (
				<ShoppingBag
					{...iconProps}
					data-testid="icon-default"
					className="size-4 shrink-0 text-amber-400"
				/>
			);
	}
}

function visibleNotifications(
	primary: Notification[] | undefined,
	alternate: Notification[] | undefined
): Notification[] {
	const seen = new Set<string>();
	const merged: Notification[] = [];
	for (const item of [...(primary ?? []), ...(alternate ?? [])]) {
		if (!item || seen.has(item.id)) continue;
		seen.add(item.id);
		merged.push(item);
	}
	return merged
		.sort(
			(a, b) =>
				new Date(getNotificationTimestamp(b)).getTime() -
				new Date(getNotificationTimestamp(a)).getTime()
		)
		.slice(0, POPOVER_MAX_NOTIFICATIONS);
}

export function NotificationPopover({
	userId = '',
	notifications,
	items,
	recent,
	unreadCount,
	isLoading,
	markAsRead,
	markAllAsRead,
	onNavigate,
	open,
	onOpenChange,
	trigger,
	className,
}: NotificationPopoverProps) {
	const navigate = useSafeNavigate();
	const hook = useNotifications(userId);
	const [internalOpen, setInternalOpen] = useState(false);
	const isOpen = open ?? internalOpen;

	const source = notifications ?? items ?? hook.notifications;
	const shown = visibleNotifications(source, recent);
	const count = unreadCount ?? hook.unreadCount;
	const loading = isLoading ?? hook.isLoading;

	const handleOpenChange = (nextOpen: boolean) => {
		if (open === undefined) setInternalOpen(nextOpen);
		onOpenChange?.(nextOpen);
	};

	const handleNotificationClick = (notification: Notification) => {
		(markAsRead ?? hook.markAsRead)(notification.id);
		const href = getNotificationHref(notification);
		if (onNavigate) onNavigate(href);
		else if (navigate) void navigate(href);
		handleOpenChange(false);
	};

	const handleMarkAllRead = () => {
		(markAllAsRead ?? hook.markAllAsRead)();
	};

	return (
		<Popover open={isOpen} onOpenChange={handleOpenChange}>
			<PopoverTrigger asChild>
				{trigger ?? (
					<button
						type="button"
						aria-label={
							count > 0 ? `Notifications — ${count} unread` : 'Notifications'
						}
						className={cn(
							'relative inline-flex items-center justify-center rounded-full p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white',
							className
						)}
					>
						<Bell className="size-5" aria-hidden="true" />
						{count > 0 && (
							<span
								data-testid="notification-badge"
								className="absolute right-1 top-1"
							>
								<span
									data-testid="notification-unread-badge"
									aria-hidden="true"
									className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 font-mono text-[10px] font-bold leading-none text-white"
								>
									{count > 99 ? '99+' : count}
								</span>
							</span>
						)}
					</button>
				)}
			</PopoverTrigger>
			<PopoverContent
				align="end"
				role="dialog"
				aria-label="Notifications"
				data-testid="notification-popover"
				className="w-80 border-white/10 bg-[#0b1728] p-0 text-white shadow-2xl"
			>
				<div
					data-testid="notification-dropdown"
					className="flex max-h-[min(30rem,80vh)] flex-col"
				>
					<div
						data-testid="notification-popover-header"
						className="flex items-center justify-between gap-2 px-3 py-2.5"
					>
						<p className="font-grotesque text-sm font-bold text-white">
							Notifications
							{count > 0 && (
								<span className="ml-2 rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-semibold text-red-400">
									{count} unread
								</span>
							)}
						</p>
						{count > 0 && (
							<span data-testid="notifications-mark-all-read">
								<button
									type="button"
									data-testid="notification-mark-all-read"
									onClick={handleMarkAllRead}
									className="text-xs font-semibold text-amber-400 hover:text-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
								>
									Mark all read
								</button>
							</span>
						)}
					</div>

					<div className="h-px bg-white/10" />

					<div className="min-h-0 flex-1 overflow-y-auto">
						{loading && (
							<div data-testid="notification-loading" className="space-y-2 p-2">
								{Array.from({ length: 3 }).map((_, index) => (
									<div
										key={index}
										className="h-12 w-full animate-pulse rounded-md bg-white/10"
									/>
								))}
							</div>
						)}

						{!loading && shown.length === 0 && (
							<p
								data-testid="notification-empty-state"
								className="px-3 py-6 text-center text-sm text-white/50"
							>
								No notifications yet
							</p>
						)}

						{!loading &&
							shown.map(notification => (
								<a
									key={notification.id}
									href={getNotificationHref(notification)}
									data-testid={`notification-item-${notification.id}`}
									aria-label={`${notification.message}. ${
										notification.read ? 'Read' : 'Unread'
									}. ${formatRelativeTime(
										getNotificationTimestamp(notification)
									)}`}
									onClick={event => {
										event.preventDefault();
										handleNotificationClick(notification);
									}}
									className={cn(
										'flex w-full cursor-pointer flex-col items-start gap-1 border-b border-white/5 px-3 py-2.5 text-left transition-colors hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400',
										!notification.read && 'bg-white/[0.05]'
									)}
								>
									<span className="flex w-full items-start gap-2.5">
										<span
											data-testid={`notification-icon-${notification.type}`}
											className="flex size-4 shrink-0 items-center justify-center"
										>
											{notificationIcon(notification.type)}
										</span>
										<span
											className={cn(
												'flex-1 text-sm leading-snug',
												notification.read
													? 'text-white/60'
													: 'font-medium text-white'
											)}
										>
											{notification.message}
										</span>
									</span>
									<span className="pl-6 text-xs text-white/40">
										{formatRelativeTime(
											getNotificationTimestamp(notification)
										)}
									</span>
								</a>
							))}
					</div>

					<div className="h-px bg-white/10" />

					<button
						type="button"
						data-testid="notification-view-all"
						onClick={() => {
							handleOpenChange(false);
							if (navigate) void navigate('/notifications');
						}}
						className="w-full px-3 py-2.5 text-center text-sm font-semibold text-amber-400 transition-colors hover:text-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
					>
						View all
					</button>
				</div>
			</PopoverContent>
		</Popover>
	);
}

export default NotificationPopover;
