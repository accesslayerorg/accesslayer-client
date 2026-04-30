import { Toaster } from 'react-hot-toast';
import { createBrowserRouter, RouterProvider } from 'react-router';
import LandingPage from './pages/LandingPage';
import { WalletProvider } from './contexts/WalletProvider';
import { WalletButton } from './components/wallet/WalletButton';
import { WalletStatusPill } from './components/wallet/WalletStatusPill';
import { ReadOnlyBanner } from './components/wallet/ReadOnlyBanner';
const router = createBrowserRouter([
	{
		path: '/',
		element: <LandingPage />,
	},
]);

function App() {
	return (
		
		<>
		<WalletProvider>

			        <ReadOnlyBanner />

			<Toaster
				toastOptions={{
					ariaProps: {
						role: 'status',
						'aria-live': 'polite',
					},
				}}
			/>
			<WalletStatusPill />
        <WalletButton />
			<RouterProvider router={router} />
			 </WalletProvider>
		</>
	);
}

export default App;
