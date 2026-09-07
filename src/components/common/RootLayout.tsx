import { Outlet } from 'react-router';
import MobileBottomNav from '@/components/common/MobileBottomNav';

/**
 * Root layout shared by all routes.
 *
 * Renders the matched child route via <Outlet> and mounts the
 * MobileBottomNav globally so it is always available on mobile viewports
 * without each page having to include it individually.
 */
export default function RootLayout() {
	return (
		<>
			<Outlet />
			{/* Fixed bottom navigation bar — visible only on viewports < 768px (md:hidden) */}
			<MobileBottomNav />
		</>
	);
}
