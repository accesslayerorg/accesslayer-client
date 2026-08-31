import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import CreatorDetailPage from './pages/CreatorDetailPage';
import CreatorDashboardPage from './pages/CreatorDashboardPage';
import NotificationsPage from './pages/NotificationsPage';
import LeaderboardPage from './pages/LeaderboardPage';
import ProfilePage from './pages/ProfilePage';
import FollowingPage from './pages/FollowingPage';
import ComparePage from './pages/ComparePage';

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
		path: '/leaderboard',
		element: <LeaderboardPage />,
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
		path: '/creator/:id/dashboard',
		element: <CreatorDashboardPage />,
	},
	{
		path: '/creators/:id/dashboard',
		element: <CreatorDashboardPage />,
	},
	{
		path: '/notifications',
		element: <NotificationsPage />,
	},
	{
		path: '/profile',
		element: <ProfilePage />,
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
		path: '/admin/dashboard',
		element: <AdminDashboardPage />,
	},
	{
		path: '*',
		element: <NotFoundPage />,
	},
];
