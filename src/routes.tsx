import type { ReactNode } from 'react';
import RootLayout from './components/common/RootLayout';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import MarketplacePage from './pages/MarketplacePage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import CreatorDetailPage from './pages/CreatorDetailPage';
import CreatorDashboardPage from './pages/CreatorDashboardPage';
import CreatorPublicProfilePage from './pages/CreatorPublicProfilePage';
import NotificationsPage from './pages/NotificationsPage';
import LeaderboardPage from './pages/LeaderboardPage';
import DiscoveryPage from './pages/DiscoveryPage';
import ProfilePage from './pages/ProfilePage';
import FollowingPage from './pages/FollowingPage';
import ComparePage from './pages/ComparePage';
import GovernancePage from './pages/GovernancePage';
import ProposalDetailPage from './pages/ProposalDetailPage';
import ReferralDashboardPage from './pages/ReferralDashboardPage';
import CreateCreatorKeyPage from './pages/CreateCreatorKeyPage';
import StakingDashboardPage from './pages/StakingDashboardPage';
import RevenueDistributionHistoryPage from './pages/RevenueDistributionHistoryPage';
import BundleManagementPage from './pages/BundleManagementPage';
import CreatorRevenueDashboardPage from './pages/CreatorRevenueDashboardPage';
import AtomicSwapCreatePage from './pages/AtomicSwapCreatePage';
import AtomicSwapProposalPage from './pages/AtomicSwapProposalPage';
import StatusPage from './pages/StatusPage';
import HolderLeaderboardPage from './pages/HolderLeaderboardPage';
import BundlesPage from './pages/BundlesPage';
import BundleDetailPage from './pages/BundleDetailPage';
import SearchResultsPage from './pages/SearchResultsPage';
import RouteErrorBoundary from './components/common/RouteErrorBoundary';

function withRouteErrorBoundary(element: ReactNode, routeName: string) {
	return (
		<RouteErrorBoundary routeName={routeName}>{element}</RouteErrorBoundary>
	);
}

export const routes = [
	{
		path: '/',
		element: <RootLayout />,
		children: [
			{
				path: '/',
				element: withRouteErrorBoundary(<HomePage />, 'Marketplace'),
			},
			{
				path: '/creators',
				element: withRouteErrorBoundary(<HomePage />, 'Marketplace'),
			},
			{
				path: '/marketplace',
				element: withRouteErrorBoundary(<MarketplacePage />, 'Marketplace'),
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
				path: '/leaderboard',
				element: <LeaderboardPage />,
			},
			{
				path: '/creator/:id',
				element: withRouteErrorBoundary(
					<CreatorDetailPage />,
					'Key detail'
				),
			},
			{
				path: '/creators/:id',
				element: withRouteErrorBoundary(
					<CreatorDetailPage />,
					'Key detail'
				),
			},
			{
				path: '/keys/:id',
				element: withRouteErrorBoundary(
					<CreatorDetailPage />,
					'Key detail'
				),
			},
			{
				path: '/creator/:id/leaderboard',
				element: <HolderLeaderboardPage />,
			},
			{
				path: '/creators/:id/leaderboard',
				element: <HolderLeaderboardPage />,
			},
			{
				path: '/creator/:address/profile',
				element: <CreatorPublicProfilePage />,
			},
			{
				path: '/creators/:address/profile',
				element: <CreatorPublicProfilePage />,
			},
			{
				path: '/creator/:id/dashboard',
				element: <CreatorDashboardPage />,
			},
			{
				path: '/creators/:id/dashboard',
				element: <CreatorDashboardPage />,
			},
			{
				path: '/creator/:id/bundles',
				element: <BundleManagementPage />,
			},
			{
				path: '/creators/:id/bundles',
				element: <BundleManagementPage />,
			},
			{
				path: '/creator/:id/revenue',
				element: <CreatorRevenueDashboardPage />,
			},
			{
				path: '/creators/:id/revenue',
				element: <CreatorRevenueDashboardPage />,
			},
			{
				path: '/creator/revenue',
				element: <CreatorRevenueDashboardPage />,
			},
			{
				path: '/notifications',
				element: <NotificationsPage />,
			},
			{
				path: '/profile',
				element: withRouteErrorBoundary(<ProfilePage />, 'Portfolio'),
			},
			{
				path: '/profile/:wallet',
				element: withRouteErrorBoundary(<ProfilePage />, 'Portfolio'),
			},
			{
				path: '/following',
				element: <FollowingPage />,
			},
			{
				path: '/compare',
				element: <ComparePage />,
			},
			{
				path: '/governance',
				element: <GovernancePage />,
			},
			{
				path: '/governance/:proposalId',
				element: <ProposalDetailPage />,
			},
			{
				path: '/referrals',
				element: <ReferralDashboardPage />,
			},
			{
				path: '/create-key',
				element: <CreateCreatorKeyPage />,
			},
			{
				path: '/staking',
				element: <StakingDashboardPage />,
			},
			{
				path: '/swap/create',
				element: <AtomicSwapCreatePage />,
			},
			{
				path: '/swap/:proposalId',
				element: <AtomicSwapProposalPage />,
			},
			{
				path: '/admin/dashboard',
				element: withRouteErrorBoundary(
					<AdminDashboardPage />,
					'Admin dashboard'
				),
			},
			{
				path: '/revenue-distribution',
				element: <RevenueDistributionHistoryPage />,
			},
			{
				// Public platform status page (#1051).
				path: '/status',
				element: <StatusPage />,
			},
			{
				// Global search results page (#1053).
				path: '/search',
				element: <SearchResultsPage />,
			},
			{
				path: '*',
				element: <NotFoundPage />,
			},
		],
	},
];
