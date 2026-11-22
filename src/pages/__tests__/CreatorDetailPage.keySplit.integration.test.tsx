/**
 * Integration tests for the key split banner on CreatorDetailPage (#1151).
 */
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import CreatorDetailPage from '../CreatorDetailPage';
import { useCreatorDetail } from '@/hooks/useCreators';
import { useWalletHoldings } from '@/hooks/useWallet';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { keySplitEventService } from '@/services/keySplitEvents.service';
import { clearSplitDismissal } from '@/utils/keySplit.utils';
import type { SplitExecutedEvent } from '@/types/keySplit';

vi.mock('@/hooks/useCreators', async importOriginal => {
	const actual = await importOriginal<typeof import('@/hooks/useCreators')>();
	return {
		...actual,
		useCreatorDetail: vi.fn(),
		useSetCoCreator: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
	};
});

vi.mock('@/hooks/useWallet', async importOriginal => {
	const actual = await importOriginal<typeof import('@/hooks/useWallet')>();
	return {
		...actual,
		useWalletHoldings: vi.fn(),
		useTradeMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
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
			queries: { retry: false },
		},
	});

const renderPage = (client = createTestQueryClient()) =>
	render(
		<QueryClientProvider client={client}>
			<MemoryRouter initialEntries={['/creators/creator-1']}>
				<Routes>
					<Route path="/creators/:id" element={<CreatorDetailPage />} />
				</Routes>
			</MemoryRouter>
		</QueryClientProvider>
	);

describe('CreatorDetailPage Key Split Event Notification (#1151)', () => {
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

	const mockCreator = (creator: Record<string, unknown>) =>
		vi.mocked(useCreatorDetail).mockReturnValue({
			data: creator,
			isLoading: false,
			error: null,
			isFetching: false,
			refetch: vi.fn(),
		} as unknown as ReturnType<typeof useCreatorDetail>);

	beforeEach(() => {
		clearSplitDismissal();
		keySplitEventService.reset();
		vi.clearAllMocks();

		vi.mocked(useWalletHoldings).mockReturnValue({
			data: [
				{
					creatorId: 'creator-1',
					quantity: 20,
					priceStroops: 1_000_000,
				},
			],
			isLoading: false,
			refetch: vi.fn(),
		} as unknown as ReturnType<typeof useWalletHoldings>);
	});

	it('renders split banner for 48h after SplitExecuted event with ratio, pre-split, and post-split balances', async () => {
		const recentSplit: SplitExecutedEvent = {
			keyId: 'creator-1',
			ratio: 2,
			executedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), // 2h ago
			preSplitBalance: 10,
			postSplitBalance: 20,
		};

		mockCreator({
			...baseCreator,
			recentSplit,
		});

		renderPage();

		await waitFor(() => {
			expect(screen.getByTestId('key-split-banner')).toBeInTheDocument();
		});

		expect(screen.getByTestId('split-ratio')).toHaveTextContent('2:1');
		expect(screen.getByTestId('pre-split-balance')).toHaveTextContent('10');
		expect(screen.getByTestId('post-split-balance')).toHaveTextContent('20');
	});

	it('does not render banner when split is older than 48h', async () => {
		const expiredSplit: SplitExecutedEvent = {
			keyId: 'creator-1',
			ratio: 2,
			executedAt: new Date(Date.now() - 50 * 3600 * 1000).toISOString(), // 50h ago
			preSplitBalance: 10,
			postSplitBalance: 20,
		};

		mockCreator({
			...baseCreator,
			recentSplit: expiredSplit,
		});

		renderPage();

		await waitFor(() => {
			expect(screen.queryByTestId('key-split-banner')).not.toBeInTheDocument();
		});
	});

	it('dismiss button clears the banner for the session', async () => {
		const user = userEvent.setup();
		const recentSplit: SplitExecutedEvent = {
			keyId: 'creator-1',
			ratio: 2,
			executedAt: new Date(Date.now() - 1000).toISOString(),
			preSplitBalance: 10,
			postSplitBalance: 20,
		};

		mockCreator({
			...baseCreator,
			recentSplit,
		});

		const { unmount } = renderPage();

		await waitFor(() => {
			expect(screen.getByTestId('key-split-banner')).toBeInTheDocument();
		});

		const dismissBtn = screen.getByTestId('split-banner-dismiss');
		await user.click(dismissBtn);

		expect(screen.queryByTestId('key-split-banner')).not.toBeInTheDocument();

		// Re-mount stays dismissed for the session
		unmount();
		renderPage();
		expect(screen.queryByTestId('key-split-banner')).not.toBeInTheDocument();
	});

	it('updates balance and displays banner immediately upon receiving a realtime SplitExecuted event', async () => {
		mockCreator(baseCreator);

		renderPage();

		expect(screen.queryByTestId('key-split-banner')).not.toBeInTheDocument();

		// Incoming live split event
		act(() => {
			keySplitEventService.emitSplitExecuted({
				keyId: 'creator-1',
				ratio: 3,
				executedAt: new Date().toISOString(),
				preSplitBalance: 20,
				postSplitBalance: 60,
			});
		});

		await waitFor(() => {
			expect(screen.getByTestId('key-split-banner')).toBeInTheDocument();
		});

		expect(screen.getByTestId('split-ratio')).toHaveTextContent('3:1');
		expect(screen.getByTestId('pre-split-balance')).toHaveTextContent('20');
		expect(screen.getByTestId('post-split-balance')).toHaveTextContent('60');
	});
});
