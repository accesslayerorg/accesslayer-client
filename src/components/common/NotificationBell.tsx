import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/hooks/useNotifications';
import { formatRelativeTime } from '@/utils/time.utils';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NotificationBellProps {
	/** The authenticated user's id used as the cache key. */
	userId: string;
	className?: string;
}

/**
 * Notification bell for the nav bar (issue #720).
 *
 * Shows an unread-count badge when count > 0, opens a dropdown of the five
 * most recent notifications, marks items read on click, and provides a
 * "View all" link to /notifications.
 */
export function NotificationBell({ userId, className = '' }: NotificationBellProps) {
	const navigate = useNavigate();
	const { recent, unreadCount, isLoading, markAsRead } = useNotifications(userId);

	const handleNotificationClick = (notificationId: string, href: string) => {
		markAsRead(notificationId);
		void navigate(href);
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					aria-label={
						unreadCount > 0
							? `Notifications — ${unreadCount} unread`
							: 'Notifications'
					}
					className={cn(
						'relative inline-flex items-center justify-center rounded-full p-2 transition-colors',
						'text-white/70 hover:bg-white/10 hover:text-white',
						className
					)}
				>
					<Bell className="size-5" aria-hidden="true" />
					{unreadCount > 0 && (
						<span
							data-testid="notification-unread-badge"
							aria-hidden="true"
							className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 font-mono text-[10px] font-bold leading-none text-white"
						>
							{unreadCount > 99 ? '99+' : unreadCount}
						</span>
					)}
				</button>
			</DropdownMenuTrigger>

			<DropdownMenuContent
				align="end"
				className="w-80"
				data-testid="notification-dropdown"
			>
				<DropdownMenuLabel className="flex items-center justify-between">
					<span>Notifications</span>
					{unreadCount > 0 && (
						<span className="ml-2 rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-semibold text-red-500">
							{unreadCount} unread
						</span>
					)}
				</DropdownMenuLabel>

				<DropdownMenuSeparator />

				{isLoading && (
					<div
						data-testid="notification-loading"
						className="space-y-2 p-2"
					>
						{Array.from({ length: 3 }).map((_, i) => (
							<div
								key={i}
								className="h-12 w-full animate-pulse rounded-md bg-muted"
							/>
						))}
					</div>
				)}

				{!isLoading && recent.length === 0 && (
					<p
						data-testid="notification-empty-state"
						className="px-3 py-6 text-center text-sm text-muted-foreground"
					>
						No notifications yet
					</p>
				)}

				{!isLoading &&
					recent.map(notification => (
						<DropdownMenuItem
							key={notification.id}
							data-testid={`notification-item-${notification.id}`}
							className={cn(
								'flex cursor-pointer flex-col items-start gap-1 px-3 py-2.5',
								!notification.read && 'bg-accent/40'
							)}
							onSelect={() =>
								handleNotificationClick(
									notification.id,
									notification.href
								)
							}
						>
							<div className="flex w-full items-start gap-2">
								{/* Unread indicator dot */}
								{!notification.read && (
									<span
										aria-label="Unread"
										className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500"
									/>
								)}
								<span
									className={cn(
										'flex-1 text-sm leading-snug',
										notification.read
											? 'text-muted-foreground'
											: 'font-medium text-foreground'
									)}
								>
									{notification.message}
								</span>
							</div>
							<span className="pl-4 text-xs text-muted-foreground">
								{formatRelativeTime(notification.createdAt)}
							</span>
						</DropdownMenuItem>
					))}

				<DropdownMenuSeparator />

				<DropdownMenuItem
					data-testid="notification-view-all"
					className="justify-center text-sm font-medium text-primary hover:text-primary"
					onSelect={() => void navigate('/notifications')}
				>
					View all
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export default NotificationBell;
