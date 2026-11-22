import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import CreatorDetailPage from '../CreatorDetailPage';
import { useCreatorDetail } from '@/hooks/useCreators';
import { useKeyPriceFloor } from '@/hooks/useKeyPriceFloor';
import { useWalletHoldings } from '@/hooks/useWallet';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/hooks/useCreators', async importOriginal => {
	const actual = await importOriginal<typeof import('@/hooks/useCreators')>();
	return {
		...actual,
		useCreatorDetail: vi.fn(),
		useSetCoCreator: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
	};
});

vi.mock('@/hooks/useKeyPriceFloor', async importOriginal => {
	const actual = await importOriginal<typeof import('@/hooks/useKeyPriceFloor')>();
	return {
		...actual,
		useKeyPriceFloor: vi.fn(),
	};
});

vi.mock('@/hooks/useWallet', () => ({
	useWalletHoldings: vi.fn(),
	useTradeMutation: vi.fn(() => ({ mutateAsync: vi.fn() })),
}));

vi.mock('wagmi', () => ({
	useAccount: () => ({ address: '0x1234567890abcdef' }),
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

describe('CreatorDetailPage Price Floor & Sell Block UI (#1152)', () => {
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

	it('renders price floor line on chart and disables sell when price <= floor', async () => {
		vi.mocked(useCreatorDetail).mockReturnValue({
			data: baseCreator,
			isLoading: false,
			error: null,
			isFetching: false,
			refetch: vi.fn(),
		} as unknown as ReturnType<typeof useCreatorDetail>);

		// User holds 5 keys for this creator
		vi.mocked(useWalletHoldings).mockReturnValue({
			data: [{ creatorId: 'creator-1', quantity: 5 }],
			isLoading: false,
		} as unknown as ReturnType<typeof useWalletHoldings>);

		// Floor price: 1.5M stroops (> 1.0M spot price)
		vi.mocked(useKeyPriceFloor).mockReturnValue({
			data: {
				keyId: 'creator-1',
				floorPriceStroops: 1_500_000,
				isActive: true,
			},
			isLoading: false,
		} as unknown as ReturnType<typeof useKeyPriceFloor>);

		renderPage();

		// Price floor indicator in legend is rendered
		await waitFor(() => {
			expect(screen.getByTestId('price-floor-legend-indicator')).toBeInTheDocument();
		});
		expect(screen.getByTestId('price-floor-legend-indicator')).toHaveTextContent(/0\.15 XLM/i);

		// Sell Key button exists and is disabled with PriceFloorActive
		const sellButton = screen.getByTestId('key-detail-sell-button');
		expect(sellButton).toBeDisabled();

		// Check tooltip surfaces PriceFloorActive reason
		const tooltips = screen.getAllByRole('tooltip');
		const floorTooltip = tooltips.find(t =>
			t.textContent?.includes('PriceFloorActive')
		);
		expect(floorTooltip).toBeDefined();
	});

	it('hides price floor line and enables sell when no price floor is configured', async () => {
		vi.mocked(useCreatorDetail).mockReturnValue({
			data: baseCreator,
			isLoading: false,
			error: null,
			isFetching: false,
			refetch: vi.fn(),
		} as unknown as ReturnType<typeof useCreatorDetail>);

		vi.mocked(useWalletHoldings).mockReturnValue({
			data: [{ creatorId: 'creator-1', quantity: 5 }],
			isLoading: false,
		} as unknown as ReturnType<typeof useWalletHoldings>);

		vi.mocked(useKeyPriceFloor).mockReturnValue({
			data: null,
			isLoading: false,
		} as unknown as ReturnType<typeof useKeyPriceFloor>);

		renderPage();

		// Price floor legend indicator is hidden
		await waitFor(() => {
			expect(screen.queryByTestId('price-floor-legend-indicator')).not.toBeInTheDocument();
		});

		// Sell button is enabled
		expect(screen.getByTestId('key-detail-sell-button')).not.toBeDisabled();
	});
});
