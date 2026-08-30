import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FollowingPage from '../FollowingPage';
import { useFollowingCreators } from '@/hooks/useFollowingCreators';

vi.mock('@/hooks/useFollowingCreators', () => ({
	useFollowingCreators: vi.fn(),
}));

vi.mock('wagmi', () => ({
	useAccount: () => ({ isConnected: false }),
	useConnect: () => ({ connectAsync: vi.fn(), connectors: [] }),
	useReconnect: () => ({ reconnectAsync: vi.fn(), connectors: [] }),
}));

vi.mock('@/hooks/useNetworkMismatch', () => ({
	useNetworkMismatch: () => ({
		isMismatch: false,
		expectedChainName: 'Stellar Testnet',
	}),
}));

vi.mock('@/hooks/useTransactionTelemetry', () => ({
	useTransactionTelemetry: () => vi.fn(),
}));

vi.mock('@/utils/useSystemTheme', () => ({
	useSystemTheme: () => ({ isDarkMode: true }),
}));

function renderWithProviders(ui: React.ReactElement) {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter>{ui}</MemoryRouter>
		</QueryClientProvider>
	);
}

describe('FollowingPage empty state', () => {
	it('does not show empty state during loading state', () => {
		vi.mocked(useFollowingCreators).mockReturnValue({
			data: [],
			isLoading: true,
			isFetched: false,
		} as unknown as ReturnType<typeof useFollowingCreators>);

		renderWithProviders(<FollowingPage />);

		expect(screen.getByTestId('following-page-loading')).toBeInTheDocument();
		expect(
			screen.queryByTestId('following-empty-state')
		).not.toBeInTheDocument();
	});

	it('shows empty state with message and Browse Marketplace button after query settles with empty array', () => {
		vi.mocked(useFollowingCreators).mockReturnValue({
			data: [],
			isLoading: false,
			isFetched: true,
		} as unknown as ReturnType<typeof useFollowingCreators>);

		renderWithProviders(<FollowingPage />);

		expect(screen.getByTestId('following-empty-state')).toBeInTheDocument();
		expect(
			screen.getByText(
				'You are not following anyone yet — discover creators on the marketplace'
			)
		).toBeInTheDocument();

		const browseButton = screen.getByTestId('browse-marketplace-button');
		expect(browseButton).toBeInTheDocument();
		expect(browseButton).toHaveTextContent('Browse Marketplace');
		expect(browseButton).toHaveAttribute('href', '/creators');
	});

	it('renders creator cards when wallet follows creators', () => {
		vi.mocked(useFollowingCreators).mockReturnValue({
			data: [
				{
					id: 'creator-1',
					title: 'Creator One',
					description: 'Bio 1',
					price: 10,
					instructorId: 'c1',
					category: 'Design',
					level: 'BEGINNER',
				},
			],
			isLoading: false,
			isFetched: true,
		} as unknown as ReturnType<typeof useFollowingCreators>);

		renderWithProviders(<FollowingPage />);

		expect(screen.getByTestId('following-creators-list')).toBeInTheDocument();
		expect(
			screen.queryByTestId('following-empty-state')
		).not.toBeInTheDocument();
	});
});
