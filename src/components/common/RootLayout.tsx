import { Outlet } from 'react-router';
import MobileBottomNav from '@/components/common/MobileBottomNav';
import BundleCartDrawer from '@/components/common/BundleCartDrawer';
import BundleCartTrigger from '@/components/common/BundleCartTrigger';

/**
 * Root layout shared by all routes.
 *
 * Renders the matched child route via <Outlet> and mounts the
 * MobileBottomNav globally so it is always available on mobile viewports
 * without each page having to include it individually. Mounts the global
 * bundle cart drawer and trigger across all routes (#1118).
 */
export default function RootLayout() {
	return (
		<>
			<Outlet />
			{/* Bundle cart drawer & floating trigger (#1118) */}
			<BundleCartTrigger />
			<BundleCartDrawer />
			{/* Fixed bottom navigation bar — visible only on viewports < 768px (md:hidden) */}
			<MobileBottomNav />
		</>
	);
}
