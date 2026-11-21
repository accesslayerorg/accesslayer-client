import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CreatorDetailPage from '../CreatorDetailPage';
import { useCreatorDetail } from '@/hooks/useCreators';
import { fetchKeyDepth } from '@/services/keyDepth.service';

vi.mock('@/hooks/useCreators', async importOriginal => {
	const original = await importOriginal<typeof import('@/hooks/useCreators')>();
	return {
		...original,
		useCreatorDetail: vi.fn(),
		useSetCoCreator: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
	};
});

vi.mock('@/services/course.service', () => ({
	courseService: {
		getCourse: vi.fn(),
		getPriceHistory: vi.fn(),
		getHoldersPage: vi.fn(),
	},
}));

vi.mock('@/services/keyDepth.service', () => ({
	fetchKeyDepth: vi.fn(),
	KEY_DEPTH_LEVELS: 20,
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

const DEPTH_SNAPSHOT = {
	bids: [
		{ price: 1.05, volume: 10 },
		{ price: 1.0, volume: 20 },
	],
	asks: [
		{ price: 1.15, volume: 5 },
		{ price: 1.2, volume: 15 },
	],
	midPrice: null,
	spread: null,
};

const creator = {
	id: 'creator-1',
	title: 'Creator One',
	description: 'Creator One Bio',
	price: 0.5,
	priceStroops: 5_000_000,
	instructorId: 'inst-1',
	socialHandle: 'creatorone',
	isVerified: true,
	thumbnail: 'https://example.com/avatar.jpg',
	category: 'Tech',
	level: 'BEGINNER' as const,
	creatorFeeBps: 250,
	protocolFeeBps: 250,
	creatorShareSupply: 100,
	volume24h: 10_000_000,
	priceHistory: [1_000_000, 2_000_000, 3_000_000],
};

function createTestQueryClient() {
	return new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
}

function renderPage() {
	return render(
		<QueryClientProvider client={createTestQueryClient()}>
			<MemoryRouter initialEntries={['/creator/creator-1']}>
				<Routes>
					<Route path="/creator/:id" element={<CreatorDetailPage />} />
				</Routes>
			</MemoryRouter>
		</QueryClientProvider>
	);
}

describe('CreatorDetailPage depth tab (#1220)', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		vi.mocked(useCreatorDetail).mockReturnValue({
			data: creator,
			isLoading: false,
			error: null,
			isFetching: false,
			refetch: vi.fn(),
		} as unknown as ReturnType<typeof useCreatorDetail>);

		vi.mocked(fetchKeyDepth).mockResolvedValue(DEPTH_SNAPSHOT);
	});

	it('offers a depth tab next to the price charts', async () => {
		renderPage();

		const depthTab = await screen.findByTestId('price-chart-tab-depth');
		expect(depthTab).toHaveAttribute('aria-selected', 'false');
		expect(screen.getByTestId('price-chart-tab-primary')).toHaveAttribute(
			'aria-selected',
			'true'
		);
	});

	it('renders the market depth chart when the depth tab is selected', async () => {
		const user = userEvent.setup();
		renderPage();

		const depthTab = await screen.findByTestId('price-chart-tab-depth');
		await user.click(depthTab);

		await waitFor(() => {
			expect(screen.getByTestId('key-depth-chart')).toBeInTheDocument();
		});

		expect(depthTab).toHaveAttribute('aria-selected', 'true');
		expect(screen.getByTestId('key-depth-best-bid')).toHaveTextContent('1.05 XLM');
		expect(screen.getByTestId('key-depth-best-ask')).toHaveTextContent('1.15 XLM');
		expect(screen.getByTestId('key-depth-mid-price')).toHaveTextContent('1.10 XLM');
		expect(fetchKeyDepth).toHaveBeenCalledWith('creator-1', 20);
	});
});
