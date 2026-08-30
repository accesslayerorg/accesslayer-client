import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import CreatorDetailPage from '../CreatorDetailPage';
import { useCreatorDetail } from '@/hooks/useCreators';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/hooks/useCreators', () => ({
	useCreatorDetail: vi.fn(),
}));

vi.mock('@/hooks/useCreatorProfileStaleIndicator', () => ({
	useCreatorProfileStaleIndicator: () => ({
		shouldShowBadge: false,
		handleRefetch: vi.fn(),
	}),
}));

vi.mock('@/hooks/useNavigationTiming', () => ({
	useNavigationTiming: vi.fn(),
}));

const createTestQueryClient = () =>
	new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
			},
		},
	});

describe('CreatorDetailPage Skeleton Loading States', () => {
	const mockCreator = {
		id: 'creator-1',
		title: 'Creator One',
		description: 'Creator One Bio',
		price: 0.5,
		priceStroops: 5000000,
		instructorId: 'inst-1',
		socialHandle: 'creatorone',
		isVerified: true,
		thumbnail: 'https://example.com/avatar.jpg',
		category: 'Tech',
		level: 'BEGINNER' as const,
		creatorFeeBps: 250,
		protocolFeeBps: 250,
		creatorShareSupply: 100,
		volume24h: 10000000,
		priceHistory: [1000000, 2000000, 3000000],
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders 4 stat cards, chart placeholder, and 5 table rows during loading state', () => {
		vi.mocked(useCreatorDetail).mockReturnValue({
			data: undefined,
			isLoading: true,
			error: null,
			isFetching: true,
			refetch: vi.fn(),
		} as unknown as ReturnType<typeof useCreatorDetail>);

		render(
			<QueryClientProvider client={createTestQueryClient()}>
				<MemoryRouter initialEntries={['/creator/creator-1']}>
					<Routes>
						<Route path="/creator/:id" element={<CreatorDetailPage />} />
					</Routes>
				</MemoryRouter>
			</QueryClientProvider>
		);

		// Assert main dashboard skeleton is present
		expect(screen.getByTestId('creator-dashboard-skeleton')).toBeInTheDocument();

		// Assert 4 stat card skeletons
		const statCardSkeletons = screen.getAllByTestId('creator-stat-card-skeleton');
		expect(statCardSkeletons).toHaveLength(4);

		// Assert chart skeleton placeholder
		expect(screen.getByTestId('creator-chart-skeleton')).toBeInTheDocument();

		// Assert 5 table row skeletons
		const holderRowSkeletons = screen.getAllByTestId('creator-holder-row-skeleton');
		expect(holderRowSkeletons).toHaveLength(5);
	});

	it('replaces all skeletons with real content when data fetch completes', async () => {
		const queryClient = createTestQueryClient();
		vi.mocked(useCreatorDetail).mockReturnValue({
			data: undefined,
			isLoading: true,
			error: null,
			isFetching: true,
			refetch: vi.fn(),
		} as unknown as ReturnType<typeof useCreatorDetail>);

		// Start in loading state
		const { rerender } = render(
			<QueryClientProvider client={queryClient}>
				<MemoryRouter initialEntries={['/creator/creator-1']}>
					<Routes>
						<Route path="/creator/:id" element={<CreatorDetailPage />} />
					</Routes>
				</MemoryRouter>
			</QueryClientProvider>
		);

		// Rerender in loaded state
		vi.mocked(useCreatorDetail).mockReturnValue({
			data: mockCreator,
			isLoading: false,
			error: null,
			isFetching: false,
			refetch: vi.fn(),
		} as unknown as ReturnType<typeof useCreatorDetail>);

		rerender(
			<QueryClientProvider client={queryClient}>
				<MemoryRouter initialEntries={['/creator/creator-1']}>
					<Routes>
						<Route path="/creator/:id" element={<CreatorDetailPage />} />
					</Routes>
				</MemoryRouter>
			</QueryClientProvider>
		);

		await waitFor(() => {
			expect(screen.queryByTestId('creator-dashboard-skeleton')).not.toBeInTheDocument();
		});

		// Assert real content is shown
		expect(screen.getByText('Creator One Profile')).toBeInTheDocument();
		expect(screen.getByTestId('creator-stat-cards')).toBeInTheDocument();
		expect(screen.getByTestId('creator-chart-container')).toBeInTheDocument();
		expect(screen.getByTestId('creator-holders-container')).toBeInTheDocument();
	});
});
