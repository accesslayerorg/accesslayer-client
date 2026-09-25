import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import CreatorDetailPage from '../CreatorDetailPage';
import { useCreatorDetail } from '@/hooks/useCreators';
import { useWalletHoldings } from '@/hooks/useWallet';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { HeldKeyPosition } from '@/utils/portfolioValue.utils';

vi.mock('@/hooks/useCreators', () => ({
	useCreatorDetail: vi.fn(),
	useSetCoCreator: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

vi.mock('@/hooks/useWallet', async importOriginal => {
	const actual =
		await importOriginal<typeof import('@/hooks/useWallet')>();
	return {
		...actual,
		useWalletHoldings: vi.fn(),
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

vi.mock('@/utils/toast.util', () => ({
	default: {
		message: vi.fn(),
		success: vi.fn(),
		error: vi.fn(),
		loading: vi.fn(),
		transactionSuccess: vi.fn(),
	},
}));

const createTestQueryClient = () =>
	new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
			},
		},
	});

const mockHoldings = vi.mocked(useWalletHoldings);

function mockWalletHolding(quantity: number) {
	const position = {
		creatorId: 'creator-1',
		quantity,
	} as HeldKeyPosition;
	mockHoldings.mockReturnValue({
		data: [position],
		isLoading: false,
		error: null,
		isFetching: false,
		refetch: vi.fn(),
	} as unknown as ReturnType<typeof useWalletHoldings>);
}

describe('CreatorDetailPage holding cap on the buy panel (#961)', () => {
	const mockCreator = {
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
		maxHoldingCap: 100,
	};

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

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(useCreatorDetail).mockReturnValue({
			data: mockCreator,
			isLoading: false,
			error: null,
			isFetching: false,
			refetch: vi.fn(),
		} as unknown as ReturnType<typeof useCreatorDetail>);
		mockHoldings.mockReturnValue({
			data: [],
			isLoading: false,
			error: null,
			isFetching: false,
			refetch: vi.fn(),
		} as unknown as ReturnType<typeof useWalletHoldings>);
	});

	it('shows the holding-cap progress and warning above 80% of the cap', async () => {
		mockWalletHolding(85);
		renderPage();

		const buyButton = await screen.findByTestId('key-detail-buy-button');
		fireEvent.click(buyButton);

		const warning = await screen.findByTestId('holding-cap-warning');
		expect(warning).toBeInTheDocument();
		expect(warning).toHaveTextContent('85% of the holding cap');

		const progress = screen.getByTestId('holding-cap-progress');
		expect(progress).toBeInTheDocument();
		expect(progress).toHaveTextContent('You hold 85 of 100 keys');
	});

	it('clamps the buy quantity to the remaining capacity on blur', async () => {
		mockWalletHolding(85);
		renderPage();

		const buyButton = await screen.findByTestId('key-detail-buy-button');
		fireEvent.click(buyButton);

		const amountInput = await screen.findByTestId('trade-dialog-amount');
		fireEvent.change(amountInput, { target: { value: '50' } });
		fireEvent.blur(amountInput);

		await waitFor(() => {
			expect(amountInput).toHaveValue('15');
		});
	});

	it('disables the buy button with a clear message at 100% of the cap', async () => {
		mockWalletHolding(100);
		renderPage();

		const buyButton = await screen.findByTestId('key-detail-buy-button');
		fireEvent.click(buyButton);

		const warning = await screen.findByTestId('holding-cap-warning');
		expect(warning).toHaveTextContent('Maximum holding cap reached');

		const confirm = screen.getByTestId('trade-dialog-confirm');
		expect(confirm).toBeDisabled();
	});

	it('shows no cap UI when the key has no holding cap', async () => {
		vi.mocked(useCreatorDetail).mockReturnValue({
			data: { ...mockCreator, maxHoldingCap: undefined },
			isLoading: false,
			error: null,
			isFetching: false,
			refetch: vi.fn(),
		} as unknown as ReturnType<typeof useCreatorDetail>);
		renderPage();

		const buyButton = await screen.findByTestId('key-detail-buy-button');
		fireEvent.click(buyButton);

		await screen.findByTestId('trade-dialog-amount');
		expect(screen.queryByTestId('holding-cap-warning')).not.toBeInTheDocument();
	});
});
