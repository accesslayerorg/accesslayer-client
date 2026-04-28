import { Toaster } from 'react-hot-toast';
import { createBrowserRouter, RouterProvider } from 'react-router';
import LandingPage from './pages/LandingPage';
import { WalletProvider } from './contexts/WalletProvider';
import { WalletButton } from './components/wallet/WalletButton';
import { WalletStatusPill } from './components/wallet/WalletStatusPill';
import { ReadOnlyBanner } from './components/wallet/ReadOnlyBanner';
import { CreatorCard } from './components/creator/CreatorCard';
import { TransactionStatusBadge } from './components/transaction/TransactionStatusBadge';
import type { TxStatus } from './components/transaction/TransactionStatusBadge';
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
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
  <CreatorCard
    id="creator-1"
    name="Alice Creator"
    handle="alice"
    keyPrice="50"
    keysSold={1200}
    onBuy={(id) => console.log('Buy:', id)}
    onViewProfile={(id) => console.log('Profile:', id)}
  />
</div>
<TransactionStatusBadge status="pending" />
<TransactionStatusBadge status="success" showLegend={false} />
			<WalletStatusPill />
        <WalletButton />
			<RouterProvider router={router} />
			 </WalletProvider>
		</>
	);
}

export default App;
