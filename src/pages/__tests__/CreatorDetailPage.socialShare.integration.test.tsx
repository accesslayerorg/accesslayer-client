import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import CreatorDetailPage from '../CreatorDetailPage';
import { useCreatorDetail } from '@/hooks/useCreators';
import { useProfileStore } from '@/hooks/useProfileStore';
import { useWalletHoldings, useTradeMutation } from '@/hooks/useWallet';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as clipboardUtils from '@/utils/clipboard.utils';

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

vi.mock('@/hooks/useWallet', () => ({
	useWalletHoldings: vi.fn(),
	useTradeMutation: vi.fn(),
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

describe('CreatorDetailPage Social Share Functionality (#1050)', () => {
	const userAddress = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFXYSFIZGK63PZZVVJAB7';
	const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

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

	let mockMutateAsync: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
		window.localStorage.clear();

		useProfileStore.setState({
			profile: {
				id: userAddress,
				email: 'test@example.com',
				handle: 'testuser',
				firstName: 'Test',
				lastName: 'User',
				role: 'STUDENT',
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
		});

		vi.mocked(useCreatorDetail).mockReturnValue({
			data: mockCreator,
			isLoading: false,
			error: null,
			isFetching: false,
			refetch: vi.fn(),
		} as unknown as ReturnType<typeof useCreatorDetail>);

		vi.mocked(useWalletHoldings).mockReturnValue({
			data: [{ creatorId: 'creator-1', quantity: 3, nextBuyAllowedAt: null }],
			isLoading: false,
		} as unknown as ReturnType<typeof useWalletHoldings>);

		mockMutateAsync = vi.fn().mockResolvedValue({ txHash: 'tx-123' });
		vi.mocked(useTradeMutation).mockReturnValue({
			mutateAsync: mockMutateAsync,
			isPending: false,
		} as unknown as ReturnType<typeof useTradeMutation>);
	});

	it('triggers share modal automatically after successful confirmed buy transaction', async () => {
		render(
			<QueryClientProvider client={createTestQueryClient()}>
				<MemoryRouter initialEntries={['/creators/creator-1']}>
					<Routes>
						<Route path="/creators/:id" element={<CreatorDetailPage />} />
					</Routes>
				</MemoryRouter>
			</QueryClientProvider>
		);

		// Click Buy Key button
		const buyButton = await screen.findByTestId('key-detail-buy-button');
		fireEvent.click(buyButton);

		// Enter amount = 2
		const amountInput = await screen.findByTestId('trade-dialog-amount');
		fireEvent.change(amountInput, { target: { value: '2' } });
		await screen.findByTestId('buy-fee-breakdown');

		if (screen.queryByTestId('price-impact-override-checkbox')) {
			fireEvent.click(screen.getByTestId('price-impact-override-checkbox'));
		}

		// Click Confirm in trade dialog (opens confirmation modal)
		const dialogConfirm = screen.getByTestId('trade-dialog-confirm');
		fireEvent.click(dialogConfirm);

		// Confirmation modal should be visible
		expect(
			await screen.findByTestId('trade-confirmation-modal')
		).toBeInTheDocument();

		// Submit trade from confirmation modal
		const confirmModalSubmit = await screen.findByTestId('confirmation-modal-confirm');
		fireEvent.click(confirmModalSubmit);

		// Trade mutation should be called with amount 2
		expect(mockMutateAsync).toHaveBeenCalledWith(
			expect.objectContaining({
				creatorId: 'creator-1',
				amount: 2,
			})
		);

		// Share modal should appear automatically after transaction confirms
		const shareModal = await screen.findByTestId('share-modal');
		expect(shareModal).toBeInTheDocument();
		expect(screen.getByTestId('share-modal-title')).toHaveTextContent('Share Your Purchase');

		// Pre-filled tweet contains key name, amount (2), and referral link with wallet param
		const tweetText = screen.getByTestId('prefilled-tweet-text').textContent ?? '';
		expect(tweetText).toContain('Alex Rivers');
		expect(tweetText).toContain('2');
		expect(tweetText).toContain(`ref=${userAddress}`);

		// Copy link button copies referral URL with wallet param
		const copySpy = vi.spyOn(clipboardUtils, 'copyTextToClipboard').mockResolvedValue();
		const copyLinkButton = screen.getByTestId('copy-referral-link-button');
		fireEvent.click(copyLinkButton);

		expect(copySpy).toHaveBeenCalledWith(
			expect.stringContaining(`/creator/creator-1?ref=${userAddress}`)
		);
		expect(await screen.findByTestId('copied-feedback')).toBeInTheDocument();

		// Dismiss option closes modal cleanly without broken state
		const dismissButton = screen.getByTestId('share-modal-dismiss-button');
		fireEvent.click(dismissButton);

		await waitFor(() => {
			expect(screen.queryByTestId('share-modal')).not.toBeInTheDocument();
		});

		// Page remains intact and buy button is still accessible
		expect(screen.getByTestId('key-detail-buy-button')).toBeInTheDocument();
	});

	it('opens share modal when clicking the share button on the key detail page', async () => {
		render(
			<QueryClientProvider client={createTestQueryClient()}>
				<MemoryRouter initialEntries={['/creators/creator-1']}>
					<Routes>
						<Route path="/creators/:id" element={<CreatorDetailPage />} />
					</Routes>
				</MemoryRouter>
			</QueryClientProvider>
		);

		// Find Share to X button on key detail page
		const shareTwitterButton = await screen.findByTestId('share-twitter-button');
		expect(shareTwitterButton).toBeInTheDocument();

		// Clicking share button opens the share modal
		fireEvent.click(shareTwitterButton);

		const shareModal = await screen.findByTestId('share-modal');
		expect(shareModal).toBeInTheDocument();

		// Pre-filled tweet contains key name, holdings amount (3), and referral link
		const tweetText = screen.getByTestId('prefilled-tweet-text').textContent ?? '';
		expect(tweetText).toContain('Alex Rivers');
		expect(tweetText).toContain('3');
		expect(tweetText).toContain(`ref=${userAddress}`);

		// Clicking "Share on X" button inside modal opens Twitter intent
		const shareIntentButton = screen.getByTestId('share-twitter-intent-button');
		fireEvent.click(shareIntentButton);

		expect(openSpy).toHaveBeenCalledTimes(1);
		const openedUrl = openSpy.mock.calls[0][0] as string;
		expect(openedUrl).toContain('https://twitter.com/intent/tweet?text=');
		expect(decodeURIComponent(openedUrl)).toContain('Alex Rivers');
		expect(decodeURIComponent(openedUrl)).toContain('3');
		expect(decodeURIComponent(openedUrl)).toContain(`ref=${userAddress}`);

		// Dismiss closes modal cleanly
		fireEvent.click(screen.getByTestId('share-modal-dismiss-button'));
		await waitFor(() => {
			expect(screen.queryByTestId('share-modal')).not.toBeInTheDocument();
		});
	});
});
