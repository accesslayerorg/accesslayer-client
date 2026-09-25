import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { createBrowserRouter, RouterProvider } from 'react-router';
import MarketingPage from './pages/MarketingPage';
import LandingPage from './pages/LandingPage';
import NotFoundPage from './pages/NotFoundPage';
import ContractPausedBanner from './components/common/ContractPausedBanner';
import { useContractPausedStore } from './hooks/useContractPausedStore';

const router = createBrowserRouter([
	{
		path: '/',
		element: <MarketingPage />,
	},
	{
		path: '/app',
		element: <LandingPage />,
	},
	{
		path: '/marketplace',
		element: <LandingPage />,
	},
	{
		path: '*',
		element: <NotFoundPage />,
	},
]);

function App() {
	// Start polling contract pause state on app load (#953)
	useEffect(() => {
		const store = useContractPausedStore.getState();
		store.startPolling();
		return () => {
			store.stopPolling();
		};
	}, []);

	return (
		<>
			{/* Full-width banner when contract emergency pause is active (#953) */}
			<ContractPausedBanner />
			<Toaster
				toastOptions={{
					ariaProps: {
						role: 'status',
						'aria-live': 'polite',
					},
				}}
			/>
			<RouterProvider router={router} />
		</>
	);
}

export default App;
