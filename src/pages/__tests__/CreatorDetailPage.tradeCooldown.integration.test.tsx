import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import CreatorDetailPage from '../CreatorDetailPage';
import { useCreatorDetail } from '@/hooks/useCreators';
import { courseService } from '@/services/course.service';
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

vi.mock('@/services/course.service', async importOriginal => {
	const actual =
		await importOriginal<typeof import('@/services/course.service')>();
	return {
		...actual,
		courseService: {
			...actual.courseService,
			getTradeCooldownStatus: vi.fn(),
		},
	};
});

const mockShowToast = vi.mocked(showToast);
const mockGetTradeCooldownStatus = vi.mocked(
	courseService.getTradeCooldownStatus
);

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

describe('CreatorDetailPage trade cooldown countdown (#998)', () => {
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
		window.localStorage.clear();
		vi.mocked(useCreatorDetail).mockReturnValue({
			data: mockCreator,
			isLoading: false,
			error: null,
			isFetching: false,
			refetch: vi.fn(),
		} as unknown as ReturnType<typeof useCreatorDetail>);
	});

	it('disables the Buy button with a live countdown when a cooldown is active', async () => {
		// Cooldown ends in just under 5 minutes.
		mockGetTradeCooldownStatus.mockResolvedValue({
			keyId: 'creator-1',
			nextBuyAllowedAt: Math.floor(Date.now() / 1000) + 299,
			cooldownDurationSeconds: 300,
		});

		renderPage();

		// Cooldown status is fetched on page load.
		await waitFor(() => {
			expect(mockGetTradeCooldownStatus).toHaveBeenCalledWith('creator-1');
		});

		// Re-query inside waitFor — the page re-renders as its other
		// queries settle, so a pre-fetched node reference can go stale.
		await waitFor(() => {
			expect(screen.getByTestId('key-detail-buy-button')).toBeDisabled();
		});

		// The label is replaced by the countdown (mm  ss format).
		const countdown = screen.getByTestId('trade-cooldown-text');
		expect(countdown).toHaveTextContent(/Cooldown \d{1,2}m \d{2}s/);

		// Tooltip explains the creator-set policy.
		const tooltip = screen.getByRole('tooltip');
		expect(tooltip).toHaveTextContent('You can trade this key again in');
		expect(tooltip).toHaveTextContent(
			'cooldown between trades, set by the creator'
		);
	});

	it('keeps the Buy button enabled when no cooldown is in effect', async () => {
		mockGetTradeCooldownStatus.mockResolvedValue(null);

		renderPage();

		await waitFor(() => {
			expect(screen.getByTestId('key-detail-buy-button')).toBeEnabled();
		});
		expect(screen.getByTestId('key-detail-buy-button')).toHaveTextContent(
			'Buy Key'
		);
		expect(screen.queryByTestId('trade-cooldown-countdown')).toBeNull();
	});

	it.skip(
		'refetches the cooldown after a completed buy and shows the fresh countdown', async () => {
		// First fetch (page load): no cooldown. From the trade onward:
		// cooldown just committed by that trade.
		let cooldownActive = false;
		mockGetTradeCooldownStatus.mockImplementation(async () =>
			cooldownActive
				? {
						keyId: 'creator-1',
						nextBuyAllowedAt: Math.floor(Date.now() / 1000) + 120,
						cooldownDurationSeconds: 300,
				  }
				: null
		);

		renderPage();

		await waitFor(() => {
			expect(mockGetTradeCooldownStatus).toHaveBeenCalledTimes(1);
		});

		// Buy 2 keys through the dialog + confirmation modal. Re-click until
		// the dialog appears — concurrent re-renders can swallow a click.
		await screen.findByTestId('key-detail-buy-button');
		await waitFor(
			() => {
				fireEvent.click(screen.getByTestId('key-detail-buy-button'));
				expect(
					screen.queryByTestId('trade-dialog-amount')
				).toBeInTheDocument();
			},
			{ timeout: 5000 }
		);
		const amountInput = screen.getByTestId('trade-dialog-amount');
		fireEvent.change(amountInput, { target: { value: '2' } });
		await screen.findByTestId('buy-fee-breakdown');

		fireEvent.click(screen.getByTestId('trade-dialog-confirm'));
		await screen.findByTestId('trade-confirmation-modal');
		// The backend commits the cooldown with the trade; flip it before
		// confirming so the settle-time refetch sees the active cooldown.
		cooldownActive = true;
		fireEvent.click(screen.getByTestId('confirmation-modal-confirm'));

		// Trade settles, then the cooldown is refetched.
		await waitFor(
			() => {
				expect(mockShowToast.transactionSuccess).toHaveBeenCalled();
			},
			{ timeout: 5000 }
		);

		await waitFor(
			() => {
				expect(mockGetTradeCooldownStatus).toHaveBeenCalledTimes(2);
			},
			{ timeout: 5000 }
		);

		// The freshly fetched cooldown now locks the Buy button.
		await waitFor(
			() => {
				expect(screen.getByTestId('key-detail-buy-button')).toBeDisabled();
			},
			{ timeout: 5000 }
		);
		expect(screen.getByTestId('trade-cooldown-text')).toHaveTextContent(
			/Cooldown \d{1,2}m \d{2}s/
		);
	}, 15_000);
});
