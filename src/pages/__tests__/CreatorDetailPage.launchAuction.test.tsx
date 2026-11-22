import type { ComponentProps, ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router';
import CreatorDetailPage from '@/pages/CreatorDetailPage';
import { courseService } from '@/services/course.service';
import { useAccount } from 'wagmi';

vi.mock('@/services/course.service', () => ({
	courseService: {
		getCourse: vi.fn(),
		getPriceHistory: vi.fn(),
		getHoldersPage: vi.fn(),
		updateCourse: vi.fn(),
		getAuctionBids: vi.fn(),
	},
}));

vi.mock('wagmi', () => ({
	useAccount: vi.fn(),
}));

vi.mock('framer-motion', async () => {
	const React = await import('react');
	type MotionProps = ComponentProps<'div'> & {
		layout?: boolean;
		transition?: unknown;
	};

	return {
		AnimatePresence: ({ children }: { children: ReactNode }) =>
			React.createElement(React.Fragment, null, children),
		LayoutGroup: ({ children }: { children: ReactNode }) =>
			React.createElement(React.Fragment, null, children),
		motion: {
			div: ({ children, ...props }: MotionProps) => {
				const { layout, transition, ...divProps } = props;
				void layout;
				void transition;
				return React.createElement('div', divProps, children);
			},
			h1: ({ children, ...props }: ComponentProps<'h1'>) =>
				React.createElement('h1', props, children),
			button: ({ children, ...props }: ComponentProps<'button'>) =>
				React.createElement('button', props, children),
		},
	};
});

const mockGetCourse = vi.mocked(courseService.getCourse);
const mockGetPriceHistory = vi.mocked(courseService.getPriceHistory);
const mockGetHoldersPage = vi.mocked(courseService.getHoldersPage);
const mockGetAuctionBids = vi.mocked(courseService.getAuctionBids);
const mockUseAccount = vi.mocked(useAccount);

function makeFreshQueryClient() {
	return new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
}

describe('CreatorDetailPage Launch Auction Integration (#1164)', () => {
	let queryClient: QueryClient;
	let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		queryClient = makeFreshQueryClient();
		mockGetCourse.mockReset();
		mockGetPriceHistory.mockResolvedValue([]);
		mockGetHoldersPage.mockResolvedValue({
			holders: [],
			nextCursor: null,
		});
		mockGetAuctionBids.mockResolvedValue([]);
		mockUseAccount.mockReturnValue({
			address: '0x1234567890abcdef1234567890abcdef12345678',
			isConnected: true,
		} as ReturnType<typeof useAccount>);
		consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.clearAllMocks();
		consoleErrorSpy.mockRestore();
	});

	it('auction panel replaces standard bonding curve panel during active auction (#1164)', async () => {
		const future = new Date(Date.now() + 3600 * 1000).toISOString();
		mockGetCourse.mockResolvedValue({
			id: 'creator-active-auction',
			title: 'Aura Key',
			description: 'Exclusive key in initial auction',
			price: 0.05,
			priceStroops: 500_000,
			creatorShareSupply: 100,
			instructorId: 'aura',
			category: 'Art',
			level: 'BEGINNER',
			isVerified: true,
			creatorFeeBps: 500,
			protocolFeeBps: 250,
			// Active auction config
			auctionPrice: 10,
			auctionSupply: 50,
			auctionSold: 10,
			auctionEndsAt: future,
			auctionMinIncrement: 0.5,
			auctionHighestBid: 12,
		});

		render(
			<QueryClientProvider client={queryClient}>
				<MemoryRouter initialEntries={['/creators/creator-active-auction']}>
					<Routes>
						<Route path="/creators/:id" element={<CreatorDetailPage />} />
					</Routes>
				</MemoryRouter>
			</QueryClientProvider>
		);

		await waitFor(() => {
			expect(screen.getByText('Aura Key')).toBeInTheDocument();
		});

		// 1. Auction panel shows correctly during active auction period
		expect(screen.getByTestId('auction-panel')).toBeInTheDocument();
		expect(screen.getByTestId('auction-phase-section')).toBeInTheDocument();
		expect(screen.getByTestId('auction-escrow-notice')).toBeInTheDocument();
		expect(screen.getByTestId('auction-countdown')).toBeInTheDocument();

		// 2. Standard bonding curve panel is replaced (hidden during active auction)
		expect(
			screen.queryByTestId('creator-chart-container')
		).not.toBeInTheDocument();

		// 3. Direct buy button on bonding curve is disabled during active auction
		const buyBtn = screen.getByTestId('key-detail-buy-button');
		expect(buyBtn).toBeDisabled();
	});

	it('post-auction panel shows clearing price and allocation once settled (#1164)', async () => {
		const past = new Date(Date.now() - 3600 * 1000).toISOString();
		mockGetCourse.mockResolvedValue({
			id: 'creator-settled-auction',
			title: 'Settled Key',
			description: 'Key after auction settlement',
			price: 0.05,
			priceStroops: 500_000,
			creatorShareSupply: 150,
			instructorId: 'settled',
			category: 'Music',
			level: 'INTERMEDIATE',
			isVerified: true,
			creatorFeeBps: 500,
			protocolFeeBps: 250,
			// Settled auction config
			auctionPrice: 10,
			auctionSupply: 50,
			auctionSold: 50,
			auctionEndsAt: past,
			auctionClearingPrice: 28.5,
			auctionAllocation: 50,
			auctionSettled: true,
			auctionBids: [
				{
					id: 'win-1',
					bidderAddress:
						'GBWINNER123456789012345678901234567890123456789012345678',
					amount: 28.5,
					placedAt: new Date(Date.now() - 7200 * 1000).toISOString(),
				},
			],
		});

		render(
			<QueryClientProvider client={queryClient}>
				<MemoryRouter
					initialEntries={['/creators/creator-settled-auction']}
				>
					<Routes>
						<Route path="/creators/:id" element={<CreatorDetailPage />} />
					</Routes>
				</MemoryRouter>
			</QueryClientProvider>
		);

		await waitFor(() => {
			expect(screen.getByText('Settled Key')).toBeInTheDocument();
		});

		// 1. Post-auction transition banner is present
		expect(
			screen.getByTestId('auction-ended-transition')
		).toBeInTheDocument();

		// 2. Clearing price and allocation are displayed
		expect(screen.getByTestId('auction-clearing-price')).toHaveTextContent(
			'28.5 XLM'
		);
		expect(screen.getByTestId('auction-allocation')).toHaveTextContent(
			'50 keys'
		);

		// 3. Bonding curve chart is now active and rendered
		expect(screen.getByTestId('creator-chart-container')).toBeInTheDocument();
	});

	it('renders standard bonding curve chart when key has no auction configured (#1164)', async () => {
		mockGetCourse.mockResolvedValue({
			id: 'creator-no-auction',
			title: 'Direct Curve Key',
			description: 'Key with direct bonding curve',
			price: 0.05,
			priceStroops: 500_000,
			creatorShareSupply: 100,
			instructorId: 'direct',
			category: 'Tech',
			level: 'BEGINNER',
			isVerified: false,
			creatorFeeBps: 500,
			protocolFeeBps: 250,
		});

		render(
			<QueryClientProvider client={queryClient}>
				<MemoryRouter initialEntries={['/creators/creator-no-auction']}>
					<Routes>
						<Route path="/creators/:id" element={<CreatorDetailPage />} />
					</Routes>
				</MemoryRouter>
			</QueryClientProvider>
		);

		await waitFor(() => {
			expect(screen.getByText('Direct Curve Key')).toBeInTheDocument();
		});

		// No auction panel rendered
		expect(screen.queryByTestId('auction-panel')).not.toBeInTheDocument();
		expect(
			screen.queryByTestId('auction-phase-section')
		).not.toBeInTheDocument();

		// Standard bonding curve chart is rendered
		expect(screen.getByTestId('creator-chart-container')).toBeInTheDocument();
	});
});
