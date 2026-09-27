import {
	render,
	screen,
	fireEvent,
	waitFor,
	cleanup,
} from '@testing-library/react';
import { act } from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CreatorDetailPage from '../CreatorDetailPage';
import { useCreatorDetail } from '@/hooks/useCreators';
import { courseService } from '@/services/course.service';
import { demoUser, useProfileStore } from '@/hooks/useProfileStore';

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

const WALLET = demoUser.id;

const nowSeconds = () => Math.floor(Date.now() / 1000);

/**
 * Short cooldown window for the expiry assertions. The budget has to cover the
 * cooldown read resolving before the panel first paints as locked out, hence
 * the generous margin over the one-second waits further down.
 */
const cooldownEndingIn = (seconds: number) => ({
	nextBuyAllowedAt: nowSeconds() + seconds,
});

const renderPage = () =>
	render(
		<QueryClientProvider
			client={
				new QueryClient({ defaultOptions: { queries: { retry: false } } })
			}
		>
			<MemoryRouter initialEntries={['/creators/creator-1']}>
				<Routes>
					<Route path="/creators/:id" element={<CreatorDetailPage />} />
				</Routes>
			</MemoryRouter>
		</QueryClientProvider>
	);

describe('CreatorDetailPage per-wallet buy cooldown (#915)', () => {
	let getKeyBuyCooldown: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		vi.clearAllMocks();
		useProfileStore.setState({ profile: demoUser });
		vi.mocked(useCreatorDetail).mockReturnValue({
			data: mockCreator,
			isLoading: false,
			error: null,
			isFetching: false,
			refetch: vi.fn(),
		} as unknown as ReturnType<typeof useCreatorDetail>);
		// Only the new cooldown read is intercepted; the page's other reads are
		// left on their real (failing) service calls, as in the other page suites.
		getKeyBuyCooldown = vi
			.spyOn(courseService, 'getKeyBuyCooldown')
			.mockResolvedValue({ nextBuyAllowedAt: null });
	});

	afterEach(() => {
		cleanup();
		getKeyBuyCooldown.mockRestore();
	});

	it('reads the cooldown for the connected wallet when the key page loads', async () => {
		getKeyBuyCooldown.mockResolvedValue({ nextBuyAllowedAt: null });

		renderPage();

		await screen.findByTestId('key-detail-buy-button');

		await waitFor(() =>
			expect(getKeyBuyCooldown).toHaveBeenCalledWith('creator-1', WALLET)
		);
	});

	it('reads the cooldown as soon as a wallet connects on the key page', async () => {
		useProfileStore.setState({ profile: null });

		renderPage();

		await screen.findByTestId('key-detail-buy-button');
		expect(getKeyBuyCooldown).not.toHaveBeenCalled();

		// Wallet connects while the key detail page is open.
		act(() => {
			useProfileStore.setState({ profile: demoUser });
		});

		await waitFor(() =>
			expect(getKeyBuyCooldown).toHaveBeenCalledWith('creator-1', WALLET)
		);
	});

	it('shows the countdown and disables the buy button while the wallet is in cooldown', async () => {
		getKeyBuyCooldown.mockResolvedValue({
			nextBuyAllowedAt: nowSeconds() + 272,
			cooldownLedgers: 12,
		});

		renderPage();

		const buyButton = await screen.findByTestId('key-detail-buy-button');
		await waitFor(() => expect(buyButton).toBeDisabled());

		// Countdown sits inside the buy panel and reports the remaining time.
		expect(screen.getByTestId('buy-cooldown-countdown')).toBeInTheDocument();
		expect(screen.getByTestId('buy-cooldown-text')).toHaveTextContent(
			'Next buy available in 4m 3'
		);

		// The button advertises the lockout instead of the normal CTA.
		expect(buyButton).toHaveTextContent('Buy in 4m 3');
		expect(buyButton).not.toHaveTextContent('Buy Key');
		expect(screen.getByTestId('key-detail-buy-cooldown-reason')).toHaveTextContent(
			'Unlocks in 4m 3'
		);
		expect(buyButton).toHaveAttribute(
			'aria-describedby',
			'key-detail-buy-cooldown-reason'
		);

		// A disabled buy button must not open the trade dialog.
		fireEvent.click(buyButton);
		expect(screen.queryByTestId('trade-dialog-amount')).not.toBeInTheDocument();
	});

	it('re-enables the buy button automatically once the countdown reaches zero', async () => {
		getKeyBuyCooldown.mockResolvedValue(cooldownEndingIn(2));

		renderPage();

		const buyButton = await screen.findByTestId('key-detail-buy-button');
		await waitFor(() => expect(buyButton).toBeDisabled());
		expect(buyButton.textContent).toMatch(/^Buy in \d+s$/);

		await waitFor(() => expect(buyButton).toBeEnabled(), { timeout: 8000 });

		// Countdown and lockout reason are cleared along with the disabled state.
		expect(buyButton).toHaveTextContent('Buy Key');
		expect(
			screen.queryByTestId('buy-cooldown-countdown')
		).not.toBeInTheDocument();
		expect(
			screen.queryByTestId('key-detail-buy-cooldown-reason')
		).not.toBeInTheDocument();
		expect(buyButton).not.toHaveAttribute('aria-describedby');

		// The re-enabled button opens the buy flow again.
		fireEvent.click(buyButton);
		expect(await screen.findByTestId('trade-dialog-amount')).toBeInTheDocument();
	});

	it('re-reads the cooldown at expiry so a configured cooldown cannot be bypassed', async () => {
		getKeyBuyCooldown.mockResolvedValue(cooldownEndingIn(2));

		renderPage();

		const buyButton = await screen.findByTestId('key-detail-buy-button');
		await waitFor(() => expect(buyButton).toBeDisabled());
		expect(getKeyBuyCooldown).toHaveBeenCalledTimes(1);

		await waitFor(() => expect(getKeyBuyCooldown).toHaveBeenCalledTimes(2), {
			timeout: 8000,
		});
	});

	it('shows the normal buy UI with no timer when the wallet is not in cooldown', async () => {
		getKeyBuyCooldown.mockResolvedValue({ nextBuyAllowedAt: null });

		renderPage();

		const buyButton = await screen.findByTestId('key-detail-buy-button');
		await waitFor(() => expect(getKeyBuyCooldown).toHaveBeenCalled());

		expect(buyButton).toBeEnabled();
		expect(buyButton).toHaveTextContent('Buy Key');
		expect(buyButton).not.toHaveAttribute('aria-describedby');
		expect(
			screen.queryByTestId('buy-cooldown-countdown')
		).not.toBeInTheDocument();
		expect(
			screen.queryByTestId('key-detail-buy-cooldown-reason')
		).not.toBeInTheDocument();

		fireEvent.click(buyButton);
		expect(await screen.findByTestId('trade-dialog-amount')).toBeInTheDocument();
	});

	it('shows the normal buy UI when the wallet has no cooldown state at all', async () => {
		getKeyBuyCooldown.mockResolvedValue(null);

		renderPage();

		const buyButton = await screen.findByTestId('key-detail-buy-button');
		await waitFor(() => expect(getKeyBuyCooldown).toHaveBeenCalled());

		expect(buyButton).toBeEnabled();
		expect(buyButton).toHaveTextContent('Buy Key');
		expect(
			screen.queryByTestId('buy-cooldown-countdown')
		).not.toBeInTheDocument();
	});

	it('leaves the buy button enabled when the cooldown read fails', async () => {
		getKeyBuyCooldown.mockRejectedValue(new Error('Network error'));

		renderPage();

		const buyButton = await screen.findByTestId('key-detail-buy-button');
		await waitFor(() => expect(getKeyBuyCooldown).toHaveBeenCalled());

		expect(buyButton).toBeEnabled();
		expect(buyButton).toHaveTextContent('Buy Key');
		expect(
			screen.queryByTestId('buy-cooldown-countdown')
		).not.toBeInTheDocument();
	});

	it('never fetches the cooldown when no wallet is connected', async () => {
		useProfileStore.setState({ profile: null });

		renderPage();

		const buyButton = await screen.findByTestId('key-detail-buy-button');
		expect(buyButton).toBeEnabled();
		expect(buyButton).toHaveTextContent('Buy Key');
		expect(getKeyBuyCooldown).not.toHaveBeenCalled();
	});
});
