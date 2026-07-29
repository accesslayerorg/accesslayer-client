import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/hooks/useNotifications';
import { useProfileStore } from '@/hooks/useProfileStore';
import { formatRelativeTime } from '@/utils/time.utils';
import { useNavigationTiming } from '@/hooks/useNavigationTiming';

export default function NotificationsPage() {
	useNavigationTiming('notifications');

	const navigate = useNavigate();
	const profile = useProfileStore(state => state.profile);
	const userId = profile?.id ?? '';

	const { recent, unreadCount, isLoading, markAsRead } =
		useNotifications(userId);

	const handleNotificationClick = (
		notificationId: string,
		href: string
	) => {
		markAsRead(notificationId);
		void navigate(href);
	};

	return (
		<main className="mx-auto max-w-2xl px-6 py-16">
			<div className="mb-8 flex items-center gap-3">
				<Bell className="size-6 text-foreground" aria-hidden="true" />
				<h1 className="font-jakarta text-2xl font-semibold">
					Notifications
				</h1>
				{unreadCount > 0 && (
					<span className="rounded-full bg-red-500/15 px-2.5 py-0.5 text-sm font-semibold text-red-500">
						{unreadCount} unread
					</span>
				)}
			</div>

			{isLoading && (
				<div
					data-testid="notifications-page-loading"
					className="space-y-3"
				>
					{Array.from({ length: 5 }).map((_, i) => (
						<div
							key={i}
							className="h-16 w-full animate-pulse rounded-xl bg-muted"
						/>
					))}
				</div>
			)}

			{!isLoading && recent.length === 0 && (
				<div
					data-testid="notifications-page-empty"
					className="flex flex-col items-center gap-3 rounded-2xl border border-border py-16 text-center"
				>
					<div className="flex size-12 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
						<Bell className="size-6" aria-hidden="true" />
					</div>
					<p className="text-sm text-muted-foreground">
						No notifications yet
					</p>
				</div>
			)}

			{!isLoading && recent.length > 0 && (
				<ul
					data-testid="notifications-page-list"
					className="divide-y divide-border rounded-xl border border-border"
				>
					{recent.map(notification => (
						<li key={notification.id}>
							<button
								type="button"
								data-testid={`notifications-page-item-${notification.id}`}
								className={cn(
									'flex w-full cursor-pointer items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-accent/40',
									!notification.read && 'bg-accent/20'
								)}
								onClick={() =>
									handleNotificationClick(
										notification.id,
										notification.href
									)
								}
							>
								{!notification.read && (
									<span
										aria-label="Unread"
										className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500"
									/>
								)}
								<div
									className={cn(
										'flex-1',
										notification.read && 'pl-4'
									)}
								>
									<p
										className={cn(
											'text-sm',
											notification.read
												? 'text-muted-foreground'
												: 'font-medium text-foreground'
										)}
									>
										{notification.message}
									</p>
									<p className="mt-1 text-xs text-muted-foreground">
										{formatRelativeTime(
											notification.createdAt
										)}
									</p>
								</div>
							</button>
						</li>
					))}
				</ul>
			)}
		</main>
	);
}
