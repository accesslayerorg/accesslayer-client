import { LayoutGrid, BarChart2, Bookmark, Bell } from 'lucide-react';
import { NavLink, useLocation } from 'react-router';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/hooks/useNotifications';
import { useProfileStore } from '@/hooks/useProfileStore';

interface Tab {
	label: string;
	href: string;
	/** Additional paths that should also highlight this tab as active. */
	matchPaths?: string[];
	icon: React.ReactNode;
	activeIcon?: React.ReactNode;
}

const tabs: Tab[] = [
	{
		label: 'Marketplace',
		href: '/',
		matchPaths: ['/creators'],
		icon: <LayoutGrid className="size-5" aria-hidden="true" />,
	},
	{
		label: 'Portfolio',
		href: '/profile',
		icon: <BarChart2 className="size-5" aria-hidden="true" />,
	},
	{
		label: 'Watchlist',
		href: '/following',
		icon: <Bookmark className="size-5" aria-hidden="true" />,
	},
	{
		label: 'Notifications',
		href: '/notifications',
		icon: <Bell className="size-5" aria-hidden="true" />,
	},
];

/**
 * Fixed bottom navigation bar for mobile viewports (< 768px).
 *
 * Renders four primary navigation tabs (Marketplace, Portfolio, Watchlist,
 * Notifications) with active route highlighting and an unread-count badge on
 * the Notifications tab.  Hidden on md+ viewports via Tailwind's `md:hidden`.
 */
export function MobileBottomNav() {
	const { pathname } = useLocation();
	const profile = useProfileStore(state => state.profile);
	const userId = profile?.id ?? '';

	const { unreadCount } = useNotifications(userId);

	function isTabActive(tab: Tab): boolean {
		if (tab.href === '/') {
			// Only exact match for root to avoid matching everything
			return pathname === '/' || (tab.matchPaths?.includes(pathname) ?? false);
		}
		return (
			pathname === tab.href ||
			pathname.startsWith(tab.href + '/') ||
			(tab.matchPaths?.some(p => pathname === p || pathname.startsWith(p + '/')) ?? false)
		);
	}

	return (
		<nav
			aria-label="Mobile navigation"
			className="md:hidden fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur-md"
		>
			<ul className="flex h-16 items-stretch" role="list">
				{tabs.map(tab => {
					const active = isTabActive(tab);
					const isNotifications = tab.href === '/notifications';

					return (
						<li key={tab.href} className="flex flex-1">
							<NavLink
								to={tab.href}
								aria-current={active ? 'page' : undefined}
								aria-label={
									isNotifications && unreadCount > 0
										? `${tab.label} — ${unreadCount} unread`
										: tab.label
								}
								className={cn(
									'relative flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors',
									active
										? 'text-foreground'
										: 'text-muted-foreground hover:text-foreground'
								)}
							>
								{/* Icon wrapper — relative so badge can be positioned inside it */}
								<span className="relative">
									{tab.icon}

									{/* Notification badge */}
									{isNotifications && unreadCount > 0 && (
										<span
											data-testid="mobile-nav-notification-badge"
											aria-hidden="true"
											className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 font-mono text-[9px] font-bold leading-none text-white"
										>
											{unreadCount > 99 ? '99+' : unreadCount}
										</span>
									)}
								</span>

								{/* Active indicator dot */}
								{active && (
									<span
										aria-hidden="true"
										className="absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-foreground"
									/>
								)}

								<span>{tab.label}</span>
							</NavLink>
						</li>
					);
				})}
			</ul>
		</nav>
	);
}

export default MobileBottomNav;
