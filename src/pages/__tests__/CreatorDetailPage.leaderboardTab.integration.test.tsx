import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CreatorDetailPage from '../CreatorDetailPage';
import { useCreatorDetail } from '@/hooks/useCreators';
import type { Course } from '@/services/course.service';

vi.mock('@/hooks/useCreators', () => ({
	useCreatorDetail: vi.fn(),
	useSetCoCreator: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
	usePriceHistory: vi.fn(() => ({ data: [], isLoading: false })),
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

vi.mock('@/hooks/usePurchaseConfetti', () => ({
	usePurchaseConfetti: vi.fn(),
}));

vi.mock('wagmi', () => ({
	useAccount: () => ({
		address: 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFXYSFIZGK63PZZVVJAB7',
		isConnected: true,
	}),
}));

const MOCK_CREATOR: Course = {
	id: 'creator-1',
	title: 'Alex Rivers',
	description: 'Digital artist & creator',
	price: 1.0,
	priceStroops: 10_000_000,
	instructorId: 'inst-1',
	thumbnail: 'https://example.com/alex.png',
	category: 'Art',
	level: 'BEGINNER',
	creatorShareSupply: 100,
	maxSupply: 1000,
};

describe('CreatorDetailPage Leaderboard Tab (#1203)', () => {
	function renderPage() {
		const client = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		return render(
			<QueryClientProvider client={client}>
				<MemoryRouter initialEntries={['/creators/creator-1']}>
					<Routes>
						<Route path="/creators/:id" element={<CreatorDetailPage />} />
					</Routes>
				</MemoryRouter>
			</QueryClientProvider>
		);
	}

	beforeEach(() => {
		vi.clearAllMocks();

		vi.mocked(useCreatorDetail).mockReturnValue({
			data: MOCK_CREATOR,
			isLoading: false,
			error: null,
			isFetching: false,
			refetch: vi.fn(),
		} as unknown as ReturnType<typeof useCreatorDetail>);
	});

	it('offers a leaderboard tab in the series tabs', async () => {
		renderPage();

		const leaderboardTab = await screen.findByTestId(
			'price-chart-tab-leaderboard'
		);
		expect(leaderboardTab).toBeInTheDocument();
		expect(leaderboardTab).toHaveAttribute('aria-selected', 'false');
		expect(leaderboardTab).toHaveTextContent('Leaderboard');
	});

	it('renders KeyHolderLeaderboardPanel when leaderboard tab is clicked', async () => {
		const user = userEvent.setup();
		renderPage();

		const leaderboardTab = await screen.findByTestId(
			'price-chart-tab-leaderboard'
		);
		await user.click(leaderboardTab);

		expect(leaderboardTab).toHaveAttribute('aria-selected', 'true');

		await waitFor(() => {
			expect(
				screen.getByTestId('key-holder-leaderboard')
			).toBeInTheDocument();
		});

		expect(
			screen.getByTestId('leaderboard-metric-tab-volume')
		).toBeInTheDocument();
		expect(
			screen.getByTestId('leaderboard-metric-tab-pnl')
		).toBeInTheDocument();
		expect(
			screen.getByTestId('leaderboard-metric-tab-holding_days')
		).toBeInTheDocument();
	});
});
