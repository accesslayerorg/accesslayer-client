import { useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import ComparisonTray from '@/components/common/ComparisonTray';
import { useKeyComparison } from '@/hooks/useKeyComparison';
import MobileBottomNav from '@/components/common/MobileBottomNav';
import BundleCartTrigger from '@/components/common/BundleCartTrigger';
import BundleCartDrawer from '@/components/common/BundleCartDrawer';
import BatchTradeTrigger from '@/components/common/BatchTradeTrigger';
import BatchTradeDrawer from '@/components/common/BatchTradeDrawer';
import RestrictedAccessScreen from '@/components/common/RestrictedAccessScreen';
import { useAccessStatus } from '@/hooks/useAccessStatus';

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
 *
 * When the connected wallet is restricted, protected pages are replaced by
 * RestrictedAccessScreen. Public read-only routes remain accessible.
 */

const PUBLIC_ROUTE_PREFIXES = ['/public'];

function isPublicRoute(pathname: string): boolean {
	return PUBLIC_ROUTE_PREFIXES.some(
		(prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
	);
}

export default function RootLayout() {
	const [bundleCartOpen, setBundleCartOpen] = useState(false);
	const { selectedKeys, removeKey, clearKeys } = useKeyComparison();
	const { pathname } = useLocation();
	const { isRestricted } = useAccessStatus();

	const showRestricted = isRestricted && !isPublicRoute(pathname);

	return (
		<>
			{showRestricted ? <RestrictedAccessScreen /> : <Outlet />}
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
			{/* Key comparison tray (#1247); the compare page has its own controls */}
			{pathname !== '/compare' && !showRestricted && (
				<ComparisonTray
					selectedKeys={selectedKeys}
					onRemoveKey={removeKey}
					onClearAll={clearKeys}
				/>
			)}
		</>
	);
}
