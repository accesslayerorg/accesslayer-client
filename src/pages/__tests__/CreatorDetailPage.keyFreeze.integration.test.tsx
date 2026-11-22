/**
 * Integration tests for the key freeze banner and disabled trading controls
 * on the Creator Detail Page (#1121).
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import CreatorDetailPage from '../CreatorDetailPage';
import { useCreatorDetail } from '@/hooks/useCreators';
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

describe('CreatorDetailPage key freeze banner & trading block (#1121)', () => {
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

	const FREEZE_REASON = 'Under review for suspicious trading activity';

	const mockCreator = (creator: Record<string, unknown>) =>
		vi.mocked(useCreatorDetail).mockReturnValue({
			data: creator,
			isLoading: false,
			error: null,
			isFetching: false,
			refetch: vi.fn(),
		} as unknown as ReturnType<typeof useCreatorDetail>);

	beforeEach(() => {
		vi.clearAllMocks();
		window.localStorage.clear();
	});

	it('shows the freeze banner, disables Buy, and surfaces the freeze tooltip', async () => {
		const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
		mockCreator({
			...baseCreator,
			isFrozen: true,
			freezeReason: FREEZE_REASON,
			freezeExpiresAt: expiresAt,
		});

		renderPage();

		// Banner is visible with the reason and a formatted expiry timestamp.
		const banner = await screen.findByTestId('key-freeze-banner');
		expect(banner).toHaveAttribute('role', 'alert');
		expect(screen.getByTestId('key-freeze-reason')).toHaveTextContent(
			FREEZE_REASON
		);
		expect(banner).toHaveTextContent('Freeze expires:');
		expect(screen.getByTestId('key-freeze-expiry')).toHaveAttribute(
			'dateTime',
			expiresAt
		);

		// Buy button is present and disabled.
		await waitFor(() => {
			expect(screen.getByTestId('key-detail-buy-button')).toBeDisabled();
		});

		// Bundle button is disabled for the same reason.
		expect(screen.getByTestId('add-to-bundle-button')).toBeDisabled();

		// Hover the buy button area to surface the UnavailableAction tooltip.
		const buyButton = screen.getByTestId('key-detail-buy-button');
		await userEvent.hover(buyButton.closest('[aria-disabled]') ?? buyButton);

		await waitFor(() => {
			const tooltips = screen.getAllByRole('tooltip');
			const freezeTooltip = tooltips.find(t =>
				t.textContent?.includes(FREEZE_REASON)
			);
			expect(freezeTooltip).toBeDefined();
		});
	});

	it('shows "indefinite" when the freeze has no expiry', async () => {
		mockCreator({
			...baseCreator,
			isFrozen: true,
			freezeReason: FREEZE_REASON,
			freezeExpiresAt: null,
		});

		renderPage();

		const banner = await screen.findByTestId('key-freeze-banner');
		expect(banner).toHaveTextContent('Freeze expires: indefinite');
		await waitFor(() => {
			expect(screen.getByTestId('key-detail-buy-button')).toBeDisabled();
		});
	});

	it('prefers the freeze reason over the trading-paused tooltip when both apply', async () => {
		mockCreator({
			...baseCreator,
			isFrozen: true,
			freezeReason: FREEZE_REASON,
			freezeExpiresAt: null,
			tradingPaused: true,
		});

		renderPage();

		await screen.findByTestId('key-freeze-banner');
		await waitFor(() => {
			expect(screen.getByTestId('key-detail-buy-button')).toBeDisabled();
		});

		const buyButton = screen.getByTestId('key-detail-buy-button');
		await userEvent.hover(buyButton.closest('[aria-disabled]') ?? buyButton);

		await waitFor(() => {
			const tooltips = screen.getAllByRole('tooltip');
			const freezeTooltip = tooltips.find(t =>
				t.textContent?.includes(FREEZE_REASON)
			);
			expect(freezeTooltip).toBeDefined();
			const pauseTooltip = tooltips.find(t =>
				t.textContent?.includes('Trading is currently paused')
			);
			expect(pauseTooltip).toBeUndefined();
		});
	});

	it('does not show the banner when the key is not frozen', async () => {
		mockCreator({ ...baseCreator, isFrozen: false });

		renderPage();

		await waitFor(() => {
			expect(screen.getByTestId('key-detail-buy-button')).toBeInTheDocument();
		});

		expect(screen.queryByTestId('key-freeze-banner')).not.toBeInTheDocument();
	});

	it('does not show the banner when freeze fields are missing', async () => {
		mockCreator({ ...baseCreator });

		renderPage();

		await waitFor(() => {
			expect(screen.getByTestId('key-detail-buy-button')).toBeInTheDocument();
		});

		expect(screen.queryByTestId('key-freeze-banner')).not.toBeInTheDocument();
	});
});
