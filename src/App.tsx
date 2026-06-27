import Lenis from 'lenis';
import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { createBrowserRouter, RouterProvider } from 'react-router';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';

const router = createBrowserRouter([
	{
		path: '/',
		element: <HomePage />,
	},
	{
		path: '*',
		element: <NotFoundPage />,
	},
]);

function App() {
	useEffect(() => {
		const lenis = new Lenis({ duration: 1.2, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
		function raf(time: number) {
			lenis.raf(time);
			requestAnimationFrame(raf);
		}
		requestAnimationFrame(raf);
		return () => lenis.destroy();
	}, []);

	return (
		<>
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
