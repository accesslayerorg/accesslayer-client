import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import CreatorDetailPage from './pages/CreatorDetailPage';
import NotificationsPage from './pages/NotificationsPage';
import BundleDetailPage from './pages/BundleDetailPage';
import BundlesPage from './pages/BundlesPage';
import DiscoveryPage from './pages/DiscoveryPage';
import GovernancePage from './pages/GovernancePage';
import LpPositionsPage from './pages/LpPositionsPage';
import ProposalCreatePage from './pages/ProposalCreatePage';
import ProposalDetailPage from './pages/ProposalDetailPage';

export const routes = [
	{
		path: '/',
		element: <HomePage />,
	},
	{
		path: '/creators',
		element: <HomePage />,
	},
	{
		path: '/creator/:id',
		element: <CreatorDetailPage />,
	},
	{
		path: '/creators/:id',
		element: <CreatorDetailPage />,
	},
	{
		path: '/notifications',
		element: <NotificationsPage />,
	},
	{
		path: '/bundles',
		element: <BundlesPage />,
	},
	{
		path: '/bundles/:id',
		element: <BundleDetailPage />,
	},
	{
		path: '/discovery',
		element: <DiscoveryPage />,
	},
	{
		path: '/discover',
		element: <DiscoveryPage />,
	},
	{
		path: '/governance',
		element: <GovernancePage />,
	},
	{
		path: '/governance/create',
		element: <ProposalCreatePage />,
	},
	{
		path: '/governance/:proposalId',
		element: <ProposalDetailPage />,
	},
	{
		path: '/liquidity',
		element: <LpPositionsPage />,
	},
	{
		path: '/lp-positions',
		element: <LpPositionsPage />,
	},
	{
		path: '/keys/:keyId/lp/:wallet',
		element: <LpPositionsPage />,
	},
	{
		path: '*',
		element: <NotFoundPage />,
	},
];
