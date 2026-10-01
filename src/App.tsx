import Lenis from 'lenis';
import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { createBrowserRouter, RouterProvider } from 'react-router';

import AppErrorBoundary from './components/common/AppErrorBoundary';
import ContractPausedBanner from './components/common/ContractPausedBanner';
import OfflineBanner from './components/common/OfflineBanner';
import SessionExpiryWatcher from './components/common/SessionExpiryWatcher';
import { useContractPausedStore } from './hooks/useContractPausedStore';
import { routes } from './routes';
import { useRouteChangeLogging } from './hooks/useRouteChangeLogging';

const router = createBrowserRouter(routes);

function App() {
	useRouteChangeLogging();

	// Start polling contract pause state on app load (#953)
	useEffect(() => {
		const store = useContractPausedStore.getState();
		store.startPolling();
		return () => {
			store.stopPolling();
		};
	}, []);

	useEffect(() => {
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
	}, []);

	return (
		<AppErrorBoundary>
			{/* Full-width banner when contract emergency pause is active (#953) */}
			<ContractPausedBanner />
			<OfflineBanner />
			<Toaster
				toastOptions={{
					ariaProps: {
						role: 'status',
						'aria-live': 'polite',
					},
				}}
			/>
			<SessionExpiryWatcher navigate={path => router.navigate(path)} />
			<RouterProvider router={router} />
		</AppErrorBoundary>
	);
}

export default App;
