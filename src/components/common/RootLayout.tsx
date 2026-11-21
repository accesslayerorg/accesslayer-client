import { useState } from 'react';
import { Outlet } from 'react-router';
import MobileBottomNav from '@/components/common/MobileBottomNav';
import BundleCartTrigger from '@/components/common/BundleCartTrigger';
import BundleCartDrawer from '@/components/common/BundleCartDrawer';
import BatchTradeTrigger from '@/components/common/BatchTradeTrigger';
import BatchTradeDrawer from '@/components/common/BatchTradeDrawer';

/**
 * Root layout shared by all routes.
 *
 * Renders the matched child route via <Outlet> and mounts the
 * MobileBottomNav globally so it is always available on mobile viewports
 * without each page having to include it individually.
 *
 * The bundle cart drawer (#1118) and batch trade drawer (#1155) also live
 * here so items queued from any key page stay reachable — and persist
 * across navigation — for the whole session.
 */
export default function RootLayout() {
	const [bundleCartOpen, setBundleCartOpen] = useState(false);

	return (
		<>
			<Outlet />
			{/* Fixed bottom navigation bar — visible only on viewports < 768px (md:hidden) */}
			<MobileBottomNav />
			{/* Bundle cart entry point + drawer, available on every route (#1118) */}
			<BundleCartTrigger onClick={() => setBundleCartOpen(true)} />
			<BundleCartDrawer
				open={bundleCartOpen}
				onClose={() => setBundleCartOpen(false)}
			/>
			{/* Batch trade entry point + drawer, available on every route (#1155) */}
			<BatchTradeTrigger />
			<BatchTradeDrawer />
		</>
	);
}
