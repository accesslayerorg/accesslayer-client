import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import CreatorDetailPage from '../CreatorDetailPage';
import { useCreatorDetail } from '@/hooks/useCreators';
import { courseService } from '@/services/course.service';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/hooks/useCreators', async importOriginal => {
	const original = await importOriginal<typeof import('@/hooks/useCreators')>();
	return {
		...original,
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

vi.mock('@/services/course.service', () => ({
	courseService: {
		getKeyTwap: vi.fn(),
		getHoldersPage: vi.fn().mockResolvedValue({ holders: [], nextCursor: null }),
		getKeyStats: vi.fn().mockResolvedValue({
			supply: 100,
			holderCount: 10,
			volume24h: 0,
			totalVolume: 0,
			twap1h: null,
			twap24h: null,
		}),
		getKeyUniqueTraders: vi.fn().mockResolvedValue({
			uniqueTraders: 10,
			uniqueTraders24hAgo: 8,
		}),
		getKeyConfig: vi.fn().mockResolvedValue({
			buyPriceStroops: 10_000_000,
			sellPriceStroops: 9_500_000,
			spreadStroops: 500_000,
			spreadBps: 500,
		}),
		getKeyOraclePrice: vi.fn().mockResolvedValue({
			priceStroops: 10_000_000,
			updatedAt: new Date().toISOString(),
			source: 'OracleFeed',
		}),
		getKeyPerformanceBond: vi.fn().mockResolvedValue(null),
		getContractPausedStatus: vi.fn().mockResolvedValue(false),
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

describe('CreatorDetailPage TWAP Overlay Integration (#931)', () => {
	const mockCreator = {
		id: 'creator-1',
		title: 'Creator One',
		description: 'Creator One Bio',
		price: 1.0,
		priceStroops: 10_000_000,
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
		priceHistory: [10_000_000, 12_000_000, 15_000_000],
	};

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(useCreatorDetail).mockReturnValue({
			data: mockCreator,
			isLoading: false,
			isError: false,
			error: null,
			refetch: vi.fn(),
		} as unknown as ReturnType<typeof useCreatorDetail>);
	});

	it('renders TWAP overlay controls and toggles between 1h and 24h windows on the price chart', async () => {
		vi.mocked(courseService.getKeyTwap).mockImplementation(async (_keyId, window) => {
			if (window === '1h') {
				return { priceStroops: 11_000_000, window: '1h' };
			}
			return { priceStroops: 10_500_000, window: '24h' };
		});

		render(
			<QueryClientProvider client={createTestQueryClient()}>
				<MemoryRouter initialEntries={['/creators/creator-1']}>
					<Routes>
						<Route path="/creators/:id" element={<CreatorDetailPage />} />
					</Routes>
				</MemoryRouter>
			</QueryClientProvider>
		);

		// Wait for chart container and initial 24h TWAP
		await waitFor(() => {
			expect(screen.getByTestId('creator-chart-container')).toBeInTheDocument();
		});

		await waitFor(() => {
			expect(screen.getByTestId('twap-controls')).toBeInTheDocument();
		});

		// Check 24h button is pressed by default
		const button24h = screen.getByTestId('twap-window-24h');
		const button1h = screen.getByTestId('twap-window-1h');
		expect(button24h).toHaveAttribute('aria-pressed', 'true');
		expect(button1h).toHaveAttribute('aria-pressed', 'false');

		// Click 1H toggle
		fireEvent.click(button1h);

		// Verify 1h window request was made
		await waitFor(() => {
			expect(courseService.getKeyTwap).toHaveBeenCalledWith('creator-1', '1h');
		});

		await waitFor(() => {
			expect(button1h).toHaveAttribute('aria-pressed', 'true');
			expect(button24h).toHaveAttribute('aria-pressed', 'false');
		});
	});

	it('handles unavailable TWAP state gracefully without chart disruption', async () => {
		vi.mocked(courseService.getKeyTwap).mockResolvedValueOnce({
			priceStroops: null,
			window: '24h',
		});

		render(
			<QueryClientProvider client={createTestQueryClient()}>
				<MemoryRouter initialEntries={['/creators/creator-1']}>
					<Routes>
						<Route path="/creators/:id" element={<CreatorDetailPage />} />
					</Routes>
				</MemoryRouter>
			</QueryClientProvider>
		);

		await waitFor(() => {
			expect(screen.getByTestId('creator-chart-container')).toBeInTheDocument();
		});

		await waitFor(() => {
			expect(screen.getByTestId('twap-status-unavailable')).toHaveTextContent(/Unavailable/i);
		});

		// The chart still renders cleanly
		expect(screen.getByTestId('creator-chart-container')).toBeInTheDocument();
	});
});
