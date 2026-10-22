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
import AccountSettingsPage from './pages/AccountSettingsPage';
import NotificationPreferencesPage from './pages/NotificationPreferencesPage';
import TransactionHistoryPage from './pages/TransactionHistoryPage';
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
import SpotlightAuctionPage from './pages/SpotlightAuctionPage';
import AtomicSwapCreatePage from './pages/AtomicSwapCreatePage';
import AtomicSwapProposalPage from './pages/AtomicSwapProposalPage';
import StatusPage from './pages/StatusPage';
import HolderLeaderboardPage from './pages/HolderLeaderboardPage';
import BundlesPage from './pages/BundlesPage';
import BundleDetailPage from './pages/BundleDetailPage';
import SearchResultsPage from './pages/SearchResultsPage';
import KeyDiscoveryFeedPage from './pages/KeyDiscoveryFeedPage';
import KeyDiscoveryLeaderboardPage from './pages/KeyDiscoveryLeaderboardPage';
import WalletPortfolioPage from './pages/WalletPortfolioPage';
import CampaignsPage from './pages/CampaignsPage';
import AutoInvestDashboardPage from './pages/AutoInvestDashboardPage';
import AirdropClaimsPage from './pages/AirdropClaimsPage';
import ProtocolAnalyticsPage from './pages/ProtocolAnalyticsPage';
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
				// Key discovery feed with sort + category filters (#1113).
				path: '/discovery/feed',
				element: <KeyDiscoveryFeedPage />,
			},
			{
				// Full list of seasonal campaigns linked from discovery (#1226).
				path: '/campaigns',
				element: <CampaignsPage />,
			},
			{
				// Key discovery leaderboard ranking top performing keys (#1206).
				path: '/discovery/leaderboard',
				element: withRouteErrorBoundary(
					<KeyDiscoveryLeaderboardPage />,
					'Key discovery leaderboard'
				),
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
				path: '/creator/:id/spotlight',
				element: <SpotlightAuctionPage />,
			},
			{
				path: '/creators/:id/spotlight',
				element: <SpotlightAuctionPage />,
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
				path: '/settings',
				element: <AccountSettingsPage />,
			},
			{
				path: '/account/settings',
				element: <AccountSettingsPage />,
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
				// Wallet portfolio table with holdings + PnL breakdown (#1116).
				path: '/portfolio',
				element: withRouteErrorBoundary(
					<WalletPortfolioPage />,
					'Wallet portfolio'
				),
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
				path: '/auto-invest',
				element: <AutoInvestDashboardPage />,
			},
			{
				// Airdrop claims page for key holders.
				path: '/airdrop-claims',
				element: withRouteErrorBoundary(
					<AirdropClaimsPage />,
					'Airdrop claims'
				),
			},
			{
				path: '/swap/create',
				element: <AtomicSwapCreatePage />,
			},
			{
				path: '/swap/pending',
				element: <AtomicSwapCreatePage />,
			},
			{
				path: '/swaps',
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
				// Public protocol analytics dashboard (#1167).
				path: '/analytics',
				element: withRouteErrorBoundary(
					<ProtocolAnalyticsPage />,
					'Protocol analytics'
				),
			},
			{
				// Global search results page (#1053).
				path: '/search',
				element: <SearchResultsPage />,
			},
			{
				path: '/settings/notifications',
				element: <NotificationPreferencesPage />,
			},
			{
				path: '/transactions',
				element: <TransactionHistoryPage />,
			},
			{
				path: '*',
				element: <NotFoundPage />,
			},
		],
	},
];
