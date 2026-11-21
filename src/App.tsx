import Lenis from 'lenis';
import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { createBrowserRouter, RouterProvider } from 'react-router';
import AppErrorBoundary from './components/common/AppErrorBoundary';
import OfflineBanner from './components/common/OfflineBanner';
import { routes } from './routes';
import { useRouteChangeLogging } from './hooks/useRouteChangeLogging';
import { usePriceAlertMonitor } from './hooks/usePriceAlertMonitor';

const router = createBrowserRouter(routes);

function App() {
	useRouteChangeLogging();
	usePriceAlertMonitor();

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
			<OfflineBanner />
			<Toaster
				toastOptions={{
					ariaProps: {
						role: 'status',
						'aria-live': 'polite',
					},
				}}
			/>
			<RouterProvider router={router} />
		</AppErrorBoundary>
	);
}

export default App;
