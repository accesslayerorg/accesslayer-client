import { useState } from 'react';
import { Bell } from 'lucide-react';
import NotificationPopover from '@/components/common/NotificationPopover';
import { useNotifications } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';

interface NotificationBellProps {
	userId: string;
	className?: string;
}

export function NotificationBell({
	userId,
	className = '',
}: NotificationBellProps) {
	const [open, setOpen] = useState(false);
	const { notifications, recent, unreadCount, isLoading, markAsRead, markAllAsRead } =
		useNotifications(userId);

	const handleOpenChange = (nextOpen: boolean) => {
		setOpen(nextOpen);
		if (nextOpen && unreadCount > 0 && typeof markAllAsRead === 'function') {
			markAllAsRead();
		}
	};

	const trigger = (
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
				<span data-testid="notification-badge" className="absolute right-1 top-1">
					<span
						data-testid="notification-unread-badge"
						aria-hidden="true"
						className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 font-mono text-[10px] font-bold leading-none text-white"
					>
						{unreadCount > 99 ? '99+' : unreadCount}
					</span>
				</span>
			)}
		</button>
	);

	return (
		<NotificationPopover
			notifications={notifications}
			recent={recent}
			unreadCount={unreadCount}
			isLoading={isLoading}
			markAsRead={markAsRead}
			markAllAsRead={markAllAsRead}
			open={open}
			onOpenChange={handleOpenChange}
			trigger={trigger}
		/>
	);
}

export default NotificationBell;
