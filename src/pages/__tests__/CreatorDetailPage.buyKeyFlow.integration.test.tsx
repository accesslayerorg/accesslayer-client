import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import CreatorDetailPage from '../CreatorDetailPage';
import { useCreatorDetail } from '@/hooks/useCreators';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import showToast from '@/utils/toast.util';

vi.mock('@/hooks/useCreators', () => ({
	useCreatorDetail: vi.fn(),
	useSetCoCreator: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
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

vi.mock('@/utils/toast.util', () => ({
	default: {
		message: vi.fn(),
		success: vi.fn(),
		error: vi.fn(),
		loading: vi.fn(),
		transactionSuccess: vi.fn(),
	},
}));

const mockShowToast = vi.mocked(showToast);

const createTestQueryClient = () =>
	new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
			},
		},
	});

describe('CreatorDetailPage Buy Key Flow with slippage protection (#919)', () => {
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
	};

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(useCreatorDetail).mockReturnValue({
			data: mockCreator,
			isLoading: false,
			error: null,
			isFetching: false,
			refetch: vi.fn(),
		} as unknown as ReturnType<typeof useCreatorDetail>);
	});

	it('opens buy key dialog with slippage protection controls when clicking Buy Key', async () => {
		render(
			<QueryClientProvider client={createTestQueryClient()}>
				<MemoryRouter initialEntries={['/creators/creator-1']}>
					<Routes>
						<Route path="/creators/:id" element={<CreatorDetailPage />} />
					</Routes>
				</MemoryRouter>
			</QueryClientProvider>
		);

		const buyButton = await screen.findByTestId('key-detail-buy-button');
		expect(buyButton).toBeInTheDocument();
		expect(buyButton).toHaveTextContent('Buy Key');

		// Click Buy Key button
		fireEvent.click(buyButton);

		// Trade dialog should be open
		const amountInput = await screen.findByTestId('trade-dialog-amount');
		expect(amountInput).toBeInTheDocument();

		// MAX button should be present
		expect(screen.getByTestId('trade-dialog-max-button')).toBeInTheDocument();

		// Slippage selector should be present with 0.5%, 1%, 2% presets
		expect(screen.getByTestId('slippage-preset-0.5')).toBeInTheDocument();
		expect(screen.getByTestId('slippage-preset-1')).toBeInTheDocument();
		expect(screen.getByTestId('slippage-preset-2')).toBeInTheDocument();
	});

	it('proceeds through confirmation modal showing max_price bound and submits with toast feedback', async () => {
		render(
			<QueryClientProvider client={createTestQueryClient()}>
				<MemoryRouter initialEntries={['/creators/creator-1']}>
					<Routes>
						<Route path="/creators/:id" element={<CreatorDetailPage />} />
					</Routes>
				</MemoryRouter>
			</QueryClientProvider>
		);

		const buyButton = await screen.findByTestId('key-detail-buy-button');
		fireEvent.click(buyButton);

		const amountInput = await screen.findByTestId('trade-dialog-amount');
		fireEvent.change(amountInput, { target: { value: '2' } });

		// Select 1% slippage
		fireEvent.click(screen.getByTestId('slippage-preset-1'));

		// Confirm in dialog (with requireConfirmation=true, this opens confirmation modal)
		fireEvent.click(screen.getByTestId('trade-dialog-confirm'));

		// Confirmation modal should be visible
		expect(
			await screen.findByTestId('trade-confirmation-modal')
		).toBeInTheDocument();
		expect(screen.getByTestId('confirmation-modal-amount')).toHaveTextContent(
			'2 keys'
		);
		expect(
			screen.getByTestId('confirmation-modal-slippage')
		).toHaveTextContent('1%');
		expect(
			screen.getByTestId('confirmation-modal-max-price')
		).toBeInTheDocument();

		// Submit from confirmation modal
		fireEvent.click(screen.getByTestId('confirmation-modal-confirm'));

		// Toast feedback
		expect(mockShowToast.loading).toHaveBeenCalledWith(
			'Submitting buy for 2 keys...'
		);

		await waitFor(() => {
			expect(mockShowToast.transactionSuccess).toHaveBeenCalledWith(
				'Trade confirmed',
				'Bought 2 keys from Alex Rivers'
			);
		});
	});
});
