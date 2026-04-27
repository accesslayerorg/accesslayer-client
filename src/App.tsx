import { Toaster } from 'react-hot-toast';
import { createBrowserRouter, RouterProvider } from 'react-router';
import LandingPage from './pages/LandingPage';

const router = createBrowserRouter([
	{
		path: '/',
		element: <LandingPage />,
	},
]);

function App() {
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
