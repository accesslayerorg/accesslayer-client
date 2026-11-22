import Lenis from 'lenis';
import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { createBrowserRouter, RouterProvider } from 'react-router';

import AppErrorBoundary from './components/common/AppErrorBoundary';
import ContractPausedBanner from './components/common/ContractPausedBanner';
import EscapeBanner from './components/common/EscapeBanner';
import OfflineBanner from './components/common/OfflineBanner';
import GlobalPauseBanner from './components/common/GlobalPauseBanner';
import PendingTransactionBanner from './components/common/PendingTransactionBanner';
import SessionExpiryWatcher from './components/common/SessionExpiryWatcher';
import BadgeAchievementListener from './components/common/BadgeAchievementListener';
import { useContractPausedStore } from './hooks/useContractPausedStore';
import { routes } from './routes';
import { useRouteChangeLogging } from './hooks/useRouteChangeLogging';
import { usePriceAlertMonitor } from './hooks/usePriceAlertMonitor';
import {
	useMotionOverrideStore,
	useReducedMotion,
} from './hooks/useReducedMotion';

const router = createBrowserRouter(routes);

function App() {
	useRouteChangeLogging();
	usePriceAlertMonitor();
	const reducedMotion = useReducedMotion();
	const motionOverride = useMotionOverrideStore(state => state.override);

	// Start polling contract pause state on app load (#953)
	useEffect(() => {
		const store = useContractPausedStore.getState();
		store.startPolling();
		return () => {
			store.stopPolling();
		};
	}, []);

	// Mirror the effective reduced-motion state onto <html> so the global CSS
	// can follow both the OS preference and the in-app override.
	useEffect(() => {
		const root = document.documentElement;
		root.classList.toggle('motion-reduce', reducedMotion);
		root.classList.toggle('motion-normal', motionOverride === false);
	}, [reducedMotion, motionOverride]);

	useEffect(() => {
		if (reducedMotion) return;
		const lenis = new Lenis({
			duration: 1.2,
			easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
		});
		function raf(time: number) {
			lenis.raf(time);
			requestAnimationFrame(raf);
		}
		requestAnimationFrame(raf);
		return () => lenis.destroy();
	}, [reducedMotion]);

	return (
		<AppErrorBoundary>
			{/* Full-width banner when contract emergency pause is active (#953) */}
			<ContractPausedBanner />
			<EscapeBanner />
			<OfflineBanner />
			<GlobalPauseBanner />
			<PendingTransactionBanner />
			<Toaster
				toastOptions={{
					ariaProps: {
						role: 'status',
						'aria-live': 'polite',
					},
				}}
			/>
			<SessionExpiryWatcher navigate={path => router.navigate(path)} />
			{/* Badge achievement celebrations, app-wide (#1222) */}
			<BadgeAchievementListener navigate={path => router.navigate(path)} />
			<RouterProvider router={router} />
		</AppErrorBoundary>
	);
}

export default App;
