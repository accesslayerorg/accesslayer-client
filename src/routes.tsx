import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import CreatorDetailPage from './pages/CreatorDetailPage';
import NotificationsPage from './pages/NotificationsPage';
import NotificationPreferencesPage from './pages/NotificationPreferencesPage';
import TransactionHistoryPage from './pages/TransactionHistoryPage';
import SettingsPage from './pages/SettingsPage';
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
		path: '/settings/notifications',
		element: <NotificationPreferencesPage />,
	},
	{
		path: '/transactions',
		element: <TransactionHistoryPage />,
	},
	{
		path: '/settings',
		element: <SettingsPage />,
	},
	{
		path: '/compare',
		element: <ComparePage />,
	},
	{
		path: '*',
		element: <NotFoundPage />,
	},
];
