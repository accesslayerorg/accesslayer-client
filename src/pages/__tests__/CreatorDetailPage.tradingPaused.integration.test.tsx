/**
 * Integration tests for the per-key trading pause banner and disabled Buy
 * button on the Creator Detail Page (#777).
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import CreatorDetailPage from '../CreatorDetailPage';
import { useCreatorDetail } from '@/hooks/useCreators';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/hooks/useCreators', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@/hooks/useCreators')>();
	return {
		...actual,
		useCreatorDetail: vi.fn(),
		useSetCoCreator: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
	};
});

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

const createTestQueryClient = () =>
	new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
			},
		},
	});

const renderPage = () =>
	render(
		<QueryClientProvider client={createTestQueryClient()}>
			<MemoryRouter initialEntries={['/creators/creator-1']}>
				<Routes>
					<Route path="/creators/:id" element={<CreatorDetailPage />} />
				</Routes>
			</MemoryRouter>
		</QueryClientProvider>
	);

describe('CreatorDetailPage trading-paused banner & buy button (#777)', () => {
	const baseCreator = {
		id: 'creator-1',
		title: 'Alex Rivers',
		description: 'Digital Artist & Illustrator',
		price: 0.1,
		priceStroops: 1_000_000,
		instructorId: 'inst-1',
		socialHandle: 'alexrivers',
		isVerified: true,
		thumbnail: 'https://example.com/avatar.jpg',
		category: 'Art',
		level: 'BEGINNER' as const,
		creatorFeeBps: 0,
		protocolFeeBps: 0,
		creatorShareSupply: 50,
		volume24h: 10_000_000,
	};

	beforeEach(() => {
		vi.clearAllMocks();
		window.localStorage.clear();
	});

	it('shows the trading-paused banner, disables Buy, and shows the pause tooltip when tradingPaused is true', async () => {
		vi.mocked(useCreatorDetail).mockReturnValue({
			data: { ...baseCreator, tradingPaused: true },
			isLoading: false,
			error: null,
			isFetching: false,
			refetch: vi.fn(),
		} as unknown as ReturnType<typeof useCreatorDetail>);

		renderPage();

		// Banner is visible with the correct text.
		const banner = await screen.findByTestId('key-trading-paused-banner');
		expect(banner).toBeInTheDocument();
		expect(banner).toHaveTextContent(
			'Trading is temporarily paused for this key'
		);

		// Buy button is present and disabled.
		await waitFor(() => {
			expect(screen.getByTestId('key-detail-buy-button')).toBeDisabled();
		});

		// Hover over the buy button area to surface the tooltip.
		const buyButton = screen.getByTestId('key-detail-buy-button');
		await userEvent.hover(buyButton.closest('[aria-disabled]') ?? buyButton);

		// The UnavailableAction tooltip contains the pause reason.
		await waitFor(() => {
			const tooltips = screen.getAllByRole('tooltip');
			const pauseTooltip = tooltips.find((t) =>
				t.textContent?.includes('Trading is currently paused')
			);
			expect(pauseTooltip).toBeDefined();
		});
	});

	it('does not show the banner when tradingPaused is false', async () => {
		vi.mocked(useCreatorDetail).mockReturnValue({
			data: { ...baseCreator, tradingPaused: false },
			isLoading: false,
			error: null,
			isFetching: false,
			refetch: vi.fn(),
		} as unknown as ReturnType<typeof useCreatorDetail>);

		renderPage();

		// Wait for the page to settle.
		await waitFor(() => {
			expect(screen.getByTestId('key-detail-buy-button')).toBeInTheDocument();
		});

		expect(
			screen.queryByTestId('key-trading-paused-banner')
		).not.toBeInTheDocument();
		expect(
			screen.queryByText('Trading is currently paused')
		).not.toBeInTheDocument();
	});

	it('does not show the banner when tradingPaused is missing', async () => {
		vi.mocked(useCreatorDetail).mockReturnValue({
			data: { ...baseCreator },
			isLoading: false,
			error: null,
			isFetching: false,
			refetch: vi.fn(),
		} as unknown as ReturnType<typeof useCreatorDetail>);

		renderPage();

		await waitFor(() => {
			expect(screen.getByTestId('key-detail-buy-button')).toBeInTheDocument();
		});

		expect(
			screen.queryByTestId('key-trading-paused-banner')
		).not.toBeInTheDocument();
	});
});
