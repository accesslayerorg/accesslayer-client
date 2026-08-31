import {
	Bell,
	ArrowRightLeft,
	Clock,
	TrendingUp,
	UserPlus,
	Key,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/hooks/useNotifications';
import { formatRelativeTime } from '@/utils/time.utils';
import type { NotificationType } from '@/services/notification.service';
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

function renderNotificationIcon(type: NotificationType) {
	switch (type) {
		case 'trade_completed':
			return (
				<ArrowRightLeft
					className="size-4 shrink-0 text-emerald-400"
					data-testid="icon-trade_completed"
					aria-hidden="true"
				/>
			);
		case 'lockup_expiring':
			return (
				<Clock
					className="size-4 shrink-0 text-amber-400"
					data-testid="icon-lockup_expiring"
					aria-hidden="true"
				/>
			);
		case 'price_moved':
			return (
				<TrendingUp
					className="size-4 shrink-0 text-cyan-400"
					data-testid="icon-price_moved"
					aria-hidden="true"
				/>
			);
		case 'new_follower':
			return (
				<UserPlus
					className="size-4 shrink-0 text-purple-400"
					data-testid="icon-new_follower"
					aria-hidden="true"
				/>
			);
		case 'key_purchase':
			return (
				<Key
					className="size-4 shrink-0 text-blue-400"
					data-testid="icon-key_purchase"
					aria-hidden="true"
				/>
			);
		case 'price_milestone':
		default:
			return (
				<Bell
					className="size-4 shrink-0 text-amber-400"
					data-testid="icon-default"
					aria-hidden="true"
				/>
			);
	}
}

/**
 * Notification bell and global drawer for the nav bar (issues #720, #800).
 *
 * Shows an unread-count badge when count > 0, opens a drawer/dropdown of recent
 * notifications sorted newest first, renders distinct icons per event type,
 * marks all notifications read on open, and clears the badge count.
 */
export function NotificationBell({
	userId,
	className = '',
}: NotificationBellProps) {
	const navigate = useNavigate();
	const { recent, unreadCount, isLoading, markAsRead, markAllAsRead } =
		useNotifications(userId);

	const handleOpenChange = (open: boolean) => {
		if (open && unreadCount > 0 && typeof markAllAsRead === 'function') {
			markAllAsRead();
		}
	};

	const handleNotificationClick = (notificationId: string, href: string) => {
		markAsRead(notificationId);
		void navigate(href);
	};

	return (
		<DropdownMenu onOpenChange={handleOpenChange}>
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
				className="w-80 border-white/10 bg-[#0b1728] text-white shadow-2xl"
				data-testid="notification-dropdown"
			>
				<DropdownMenuLabel className="flex items-center justify-between font-grotesque font-bold text-white">
					<span>Notifications</span>
					{unreadCount > 0 && (
						<span className="ml-2 rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-semibold text-red-400">
							{unreadCount} unread
						</span>
					)}
				</DropdownMenuLabel>

				<DropdownMenuSeparator className="bg-white/10" />

				{isLoading && (
					<div data-testid="notification-loading" className="space-y-2 p-2">
						{Array.from({ length: 3 }).map((_, i) => (
							<div
								key={i}
								className="h-12 w-full animate-pulse rounded-md bg-white/10"
							/>
						))}
					</div>
				)}

				{!isLoading && recent.length === 0 && (
					<p
						data-testid="notification-empty-state"
						className="px-3 py-6 text-center text-sm text-white/50"
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
								'flex cursor-pointer flex-col items-start gap-1 px-3 py-2.5 hover:bg-white/10 focus:bg-white/10',
								!notification.read && 'bg-white/[0.05]'
							)}
							onSelect={() =>
								handleNotificationClick(
									notification.id,
									notification.href
								)
							}
						>
							<div className="flex w-full items-start gap-2.5">
								{renderNotificationIcon(notification.type)}
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
							</div>
							<span className="pl-6 text-xs text-white/40">
								{formatRelativeTime(notification.createdAt)}
							</span>
						</DropdownMenuItem>
					))}

				<DropdownMenuSeparator className="bg-white/10" />

				<DropdownMenuItem
					data-testid="notification-view-all"
					className="justify-center text-sm font-semibold text-amber-400 hover:text-amber-300 focus:text-amber-300"
					onSelect={() => void navigate('/notifications')}
				>
					View all
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export default NotificationBell;
