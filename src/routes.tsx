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
feat/otc-trade-escrow
import OtcTradePage from './pages/OtcTradePage';
import AccountSettingsPage from './pages/AccountSettingsPage';
import NotificationPreferencesPage from './pages/NotificationPreferencesPage';
import PriceAlertsSettingsPage from './pages/PriceAlertsSettingsPage';
import TransactionHistoryPage from './pages/TransactionHistoryPage';
import LeaderboardPage from './pages/LeaderboardPage';
import DiscoveryPage from './pages/DiscoveryPage';
import ProfilePage from './pages/ProfilePage';
import FollowingPage from './pages/FollowingPage';
import ComparePage from './pages/ComparePage';
import GovernancePage from './pages/GovernancePage';
import GovernanceFeedPage from './pages/GovernanceFeedPage';
import ProposalDetailPage from './pages/ProposalDetailPage';
import ReferralDashboardPage from './pages/ReferralDashboardPage';
import CreateCreatorKeyPage from './pages/CreateCreatorKeyPage';
import StakingDashboardPage from './pages/StakingDashboardPage';
import BorrowPage from './pages/BorrowPage';
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
import RentalMarketPage from './pages/RentalMarketPage';
import MyRentalsPage from './pages/MyRentalsPage';
import AutoInvestDashboardPage from './pages/AutoInvestDashboardPage';
import AirdropClaimsPage from './pages/AirdropClaimsPage';
import ProtocolAnalyticsPage from './pages/ProtocolAnalyticsPage';
import EscapeRedeemPage from './pages/EscapeRedeemPage';
import LpPositionsPage from './pages/LpPositionsPage';
import ProposalCreatePage from './pages/ProposalCreatePage';
import ApiKeysPage from './pages/ApiKeysPage';
import RetirementBuybackConfirmedPage from './pages/RetirementBuybackConfirmedPage';
import RouteErrorBoundary from './components/common/RouteErrorBoundary';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminTwoFactorSetupPage from './pages/AdminTwoFactorSetupPage';
import AdminTwoFactorChallengePage from './pages/AdminTwoFactorChallengePage';
import AdminTwoFactorGuard from './components/admin/AdminTwoFactorGuard';

function withRouteErrorBoundary(element: ReactNode, routeName: string) {
	return (
		<RouteErrorBoundary routeName={routeName}>{element}</RouteErrorBoundary>
	);
}
 dev

export const routes = [
	{
		path: '/',
 feat/otc-trade-escrow
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
		path: '/otc/:id',
		element: <OtcTradePage />,
	},
	{
		path: '*',
		element: <NotFoundPage />
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
				// Key rental market: listings with fee, max days and collateral (#1360).
				path: '/rentals',
				element: withRouteErrorBoundary(
					<RentalMarketPage />,
					'Key rentals'
				),
			},
			{
				// Listed, rented out and rented in keys for the wallet (#1360).
				path: '/rentals/mine',
				element: withRouteErrorBoundary(<MyRentalsPage />, 'My rentals'),
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
				path: '/keys/:id/retirement/confirmed',
				element: withRouteErrorBoundary(
					<RetirementBuybackConfirmedPage />,
					'Retirement buyback confirmation'
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
				path: '/keys/:keyId/lp',
				element: withRouteErrorBoundary(
					<LpPositionsPage />,
					'Liquidity positions'
				),
			},
			{
				path: '/keys/:keyId/lp/:wallet',
				element: withRouteErrorBoundary(
					<LpPositionsPage />,
					'Liquidity positions'
				),
			},
			{
				path: '/lp-positions',
				element: withRouteErrorBoundary(
					<LpPositionsPage />,
					'Liquidity positions'
				),
			},
			{
				path: '/liquidity',
				element: withRouteErrorBoundary(
					<LpPositionsPage />,
					'Liquidity positions'
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
				path: '/governance/activity',
				element: withRouteErrorBoundary(
					<GovernanceFeedPage />,
					'Governance Activity'
				),
			},
			{
				path: '/governance/create',
				element: <ProposalCreatePage />,
			},
			{
				path: '/governance/new',
				element: <ProposalCreatePage />,
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
				path: '/borrow',
				element: withRouteErrorBoundary(<BorrowPage />, 'Borrow'),
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
				element: (
					<AdminTwoFactorGuard>
						{withRouteErrorBoundary(
							<AdminDashboardPage />,
							'Admin dashboard'
						)}
					</AdminTwoFactorGuard>
				),
			},
			{
				path: '/admin/login',
				element: <AdminLoginPage />,
			},
			{
				path: '/admin/2fa/setup',
				element: <AdminTwoFactorSetupPage />,
			},
			{
				path: '/admin/2fa/challenge',
				element: <AdminTwoFactorChallengePage />,
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
				// Emergency redemption page for escape hatch withdrawals (#1320).
				path: '/escape',
				element: withRouteErrorBoundary(
					<EscapeRedeemPage />,
					'Emergency redemption'
				),
			},
			{
				// Global search results page (#1053).
				path: '/search',
				element: <SearchResultsPage />,
			},
			{
				// Developer API key management for integrators and creators (#1322).
				path: '/settings/developer',
				element: <ApiKeysPage />,
			},
			{
				path: '/settings/notifications',
				element: <NotificationPreferencesPage />,
			},
			{
				path: '/settings/alerts',
				element: <PriceAlertsSettingsPage />,
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
dev
	},
];
