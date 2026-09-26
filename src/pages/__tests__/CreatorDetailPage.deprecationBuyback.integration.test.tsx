import type { ComponentProps, ReactNode } from 'react';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router';
import CreatorDetailPage from '@/pages/CreatorDetailPage';
import { courseService } from '@/services/course.service';
import { queryKeys } from '@/lib/queryKeys';
import { useProfileStore } from '@/hooks/useProfileStore';
import type { HeldKeyPosition } from '@/utils/portfolioValue.utils';

vi.mock('@/services/course.service', () => ({
	courseService: {
		getCourse: vi.fn(),
		getHoldersPage: vi.fn(),
		getKeyBuyback: vi.fn(),
	},
}));

vi.mock('framer-motion', async () => {
	const ReactModule = await import('react');
	type MotionProps = ComponentProps<'div'> & {
		layout?: boolean;
		transition?: unknown;
	};

	return {
		AnimatePresence: ({ children }: { children: ReactNode }) =>
			ReactModule.createElement(ReactModule.Fragment, null, children),
		LayoutGroup: ({ children }: { children: ReactNode }) =>
			ReactModule.createElement(ReactModule.Fragment, null, children),
		motion: {
			div: ({ children, ...props }: MotionProps) => {
				const { layout, transition, ...divProps } = props;
				void layout;
				void transition;
				return ReactModule.createElement('div', divProps, children);
			},
			h1: ({ children, ...props }: ComponentProps<'h1'>) =>
				ReactModule.createElement('h1', props, children),
			button: ({ children, ...props }: ComponentProps<'button'>) =>
				ReactModule.createElement('button', props, children),
		},
	};
});

const mockGetCourse = vi.mocked(courseService.getCourse);
const mockGetHoldersPage = vi.mocked(courseService.getHoldersPage);
const mockGetKeyBuyback = vi.mocked(courseService.getKeyBuyback);

describe('CreatorDetailPage - Key Deprecation & Buyback Flow Integration (#923)', () => {
	let queryClient: QueryClient;
	const userAddress = 'user_123456789';

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: {
				queries: { retry: false, staleTime: Infinity },
				mutations: { retry: false },
			},
		});

		mockGetCourse.mockReset();
		mockGetHoldersPage.mockReset();
		mockGetKeyBuyback.mockReset();

		mockGetHoldersPage.mockResolvedValue({
			holders: [],
			nextCursor: null,
		});

		useProfileStore.setState({
			profile: {
				...useProfileStore.getState().profile!,
				id: userAddress,
			},
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('does NOT render deprecation banner when creator key is not deprecated', async () => {
		mockGetCourse.mockResolvedValue({
			id: 'active-creator-1',
			title: 'Active Creator',
			description: 'Still producing content and active on marketplace',
			price: 0.1,
			priceStroops: 1_000_000,
			creatorShareSupply: 100,
			instructorId: 'active1',
			category: 'Design',
			level: 'BEGINNER',
			deprecated: false,
		});

		render(
			<QueryClientProvider client={queryClient}>
				<MemoryRouter initialEntries={['/creators/active-creator-1']}>
					<Routes>
						<Route path="/creators/:id" element={<CreatorDetailPage />} />
					</Routes>
				</MemoryRouter>
			</QueryClientProvider>
		);

		expect(
			await screen.findByText('Active Creator Profile')
		).toBeInTheDocument();
		expect(
			screen.queryByTestId('key-deprecation-banner')
		).not.toBeInTheDocument();
	});

	it('renders deprecation banner and executes complete holder buyback flow with settlement confirmation and position clearing', async () => {
		const user = userEvent.setup();
		const creatorId = 'deprecated-creator-923';

		mockGetCourse.mockResolvedValue({
			id: creatorId,
			title: 'Elena Rostova',
			description: 'Retired pioneer of digital generative art',
			price: 0.25,
			priceStroops: 2_500_000,
			creatorShareSupply: 150,
			instructorId: 'erostova',
			category: 'Art',
			level: 'ADVANCED',
			deprecated: true,
			deprecationReason:
				'Creator transitioned off-platform; guaranteed buyback enabled.',
		});

		mockGetKeyBuyback.mockResolvedValue({
			keyId: creatorId,
			deprecated: true,
			buybackPriceStroops: 2_500_000,
			expiryDate: '2026-11-30T23:59:59Z',
			terms: 'Guaranteed contract buyback at 0.25 XLM per key. Payout settled directly in XLM.',
			isActive: true,
		});

		// Seed wallet holdings with 4 keys held
		const initialHoldings: HeldKeyPosition[] = [
			{
				creatorId,
				quantity: 4,
				priceStroops: 2_500_000,
				price: 0.25,
			},
		];
		queryClient.setQueryData(
			queryKeys.wallet.holdings(userAddress),
			initialHoldings
		);

		render(
			<QueryClientProvider client={queryClient}>
				<MemoryRouter initialEntries={[`/creators/${creatorId}`]}>
					<Routes>
						<Route path="/creators/:id" element={<CreatorDetailPage />} />
					</Routes>
				</MemoryRouter>
			</QueryClientProvider>
		);

		// 1. Verify deprecation banner renders with fetched contract buyback price and expiry
		expect(
			await screen.findByTestId('key-deprecation-banner')
		).toBeInTheDocument();
		expect(screen.getByText('Key Deprecated')).toBeInTheDocument();
		expect(
			screen.getByText(
				'Creator transitioned off-platform; guaranteed buyback enabled.'
			)
		).toBeInTheDocument();

		expect(await screen.findByTestId('buyback-price')).toHaveTextContent(
			'0.25 XLM'
		);
		expect(screen.getByTestId('buyback-expiry')).toBeInTheDocument();

		// 2. Verify Initiate Buyback button shows keys held
		const initiateButton = screen.getByTestId('initiate-buyback-button');
		expect(initiateButton).toBeEnabled();
		expect(screen.getByText(/Holding 4 keys/i)).toBeInTheDocument();

		// 3. Click Initiate Buyback to open confirmation modal
		await user.click(initiateButton);

		expect(
			await screen.findByTestId('key-buyback-modal')
		).toBeInTheDocument();
		expect(screen.getByText('Confirm Key Buyback')).toBeInTheDocument();
		expect(screen.getByTestId('buyback-terms')).toHaveTextContent(
			'Guaranteed contract buyback at 0.25 XLM per key.'
		);
		// Payout for 4 keys @ 0.25 XLM = 1.00 XLM
		expect(screen.getByText('1.00 XLM')).toBeInTheDocument();

		// 4. Click Confirm Buyback to trigger contract transaction
		const confirmButton = screen.getByTestId('confirm-buyback-button');
		await user.click(confirmButton);

		// 5. Verify post-buyback settlement confirmation state
		expect(
			await screen.findByTestId('buyback-settlement-confirmed')
		).toBeInTheDocument();
		const receipt = screen.getByTestId('buyback-settlement-receipt');
		expect(receipt).toBeInTheDocument();
		expect(receipt).toHaveTextContent('1.00 XLM');
		expect(receipt).toHaveTextContent(
			'Position cleared. 0 keys remaining in your wallet.'
		);

		// 6. Close the modal
		const doneButton = screen.getByTestId('buyback-done-button');
		await user.click(doneButton);

		// 7. Verify modal closed, holdings cleared in React Query cache
		await waitFor(() => {
			expect(
				screen.queryByTestId('key-buyback-modal')
			).not.toBeInTheDocument();
		});

		const currentHoldings = queryClient.getQueryData<HeldKeyPosition[]>(
			queryKeys.wallet.holdings(userAddress)
		);
		expect(currentHoldings).toEqual([]);

		// 8. Verify Banner updates to show position cleared
		expect(
			screen.getByText(/Settlement confirmed! Redeemed 4 keys for 1.00 XLM/i)
		).toBeInTheDocument();
		expect(screen.getByTestId('initiate-buyback-button')).toBeDisabled();
		expect(screen.getByTestId('initiate-buyback-button')).toHaveTextContent(
			'No Keys Held'
		);
	});
});
