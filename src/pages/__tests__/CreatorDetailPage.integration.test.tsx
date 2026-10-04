import type { ComponentProps, ReactNode } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router';
import CreatorDetailPage from '@/pages/CreatorDetailPage';
import CreatorDashboardPage from '@/pages/CreatorDashboardPage';
import { courseService } from '@/services/course.service';
import { ApiError } from '@/services/api.service';
import { queryKeys } from '@/lib/queryKeys';
import { useAccount } from 'wagmi';

vi.mock('@/services/course.service', () => ({
	courseService: {
		getCourse: vi.fn(),
		getPriceHistory: vi.fn(),
		getHoldersPage: vi.fn(),
		updateCourse: vi.fn(),
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
const mockUpdateCourse = vi.mocked(courseService.updateCourse);
const mockUseAccount = vi.mocked(useAccount);

function makeFreshQueryClient() {
	return new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
}

function createDeferred<T>() {
	let resolve!: (value: T | PromiseLike<T>) => void;
	let reject!: (reason?: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});

	return { promise, resolve, reject };
}

describe('CreatorDetailPage Integration', () => {
	let queryClient: QueryClient;
	let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		queryClient = makeFreshQueryClient();
		mockGetCourse.mockReset();
		mockGetPriceHistory.mockResolvedValue([]);
		mockGetHoldersPage.mockReset();
		mockUpdateCourse.mockReset();
		mockUseAccount.mockReturnValue({ address: undefined } as ReturnType<
			typeof useAccount
		>);
		mockGetHoldersPage.mockResolvedValue({
			holders: [],
			nextCursor: null,
		});
		consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.clearAllMocks();
		consoleErrorSpy.mockRestore();
	});

	it('renders details, applies bpsToPercent, and formats fees as percentages', async () => {
		mockGetCourse.mockResolvedValue({
			id: 'creator-123',
			title: 'Alex Rivers',
			description: 'Digital Artist & Illustrator',
			price: 0.05,
			priceStroops: 500_000,
			creatorShareSupply: 120,
			instructorId: 'arivers',
			category: 'Art',
			level: 'BEGINNER',
			isVerified: true,
			thumbnail:
				'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
			creatorFeeBps: 500, // 5%
			protocolFeeBps: 250, // 2.5%
		});

		render(
			<QueryClientProvider client={queryClient}>
				<MemoryRouter initialEntries={['/creators/creator-123']}>
					<Routes>
						<Route path="/creators/:id" element={<CreatorDetailPage />} />
					</Routes>
				</MemoryRouter>
			</QueryClientProvider>
		);

		// Assert creator details render
		expect(
			await screen.findByText('Alex Rivers Profile')
		).toBeInTheDocument();
		expect(
			screen.getByText('Digital Artist & Illustrator')
		).toBeInTheDocument();

		// Assert fee labels are visible
		expect(screen.getByText('Creator fee')).toBeInTheDocument();
		expect(screen.getByText('Protocol fee')).toBeInTheDocument();

		// Assert percentage strings are displayed
		expect(screen.getByText('5%')).toBeInTheDocument();
		expect(screen.getByText('2.5%')).toBeInTheDocument();

		// Assert raw bps values are not visible in the rendered output
		expect(screen.queryByText('500')).not.toBeInTheDocument();
		expect(screen.queryByText('250')).not.toBeInTheDocument();
	});

	it('sets the creator title and renders holder concentration after holders load', async () => {
		mockGetCourse.mockResolvedValue({
			id: 'creator-123',
			title: 'Alex Rivers',
			description: 'Digital Artist & Illustrator',
			price: 0.05,
			priceStroops: 500_000,
			creatorShareSupply: 100,
			instructorId: 'arivers',
			category: 'Art',
			level: 'BEGINNER',
			creatorFeeBps: 500,
			protocolFeeBps: 250,
		});
		mockGetHoldersPage.mockResolvedValue({
			nextCursor: null,
			holders: [
				{
					id: 'holder-1',
					displayName: 'Holder 1',
					walletAddress:
						'GABCDE1234567890ABCDE1234567890ABCDE1234567890ABCDEF',
					keyCount: 30,
				},
				{
					id: 'holder-2',
					displayName: 'Holder 2',
					walletAddress:
						'GBCDE1234567890ABCDE1234567890ABCDE1234567890ABCDEF1',
					keyCount: 15,
				},
				{
					id: 'holder-3',
					displayName: 'Holder 3',
					walletAddress:
						'GCDEF1234567890ABCDE1234567890ABCDE1234567890ABCDEF2',
					keyCount: 10,
				},
			],
		});

		render(
			<QueryClientProvider client={queryClient}>
				<MemoryRouter initialEntries={['/creators/creator-123']}>
					<Routes>
						<Route path="/creators/:id" element={<CreatorDetailPage />} />
					</Routes>
				</MemoryRouter>
			</QueryClientProvider>
		);

		expect(
			await screen.findByText('Alex Rivers Profile')
		).toBeInTheDocument();
		expect(document.title).toBe('Alex Rivers — AccessLayer');
		expect(
			await screen.findByTestId('holder-concentration-chart')
		).toBeInTheDocument();
		expect(
			screen.getAllByTestId('holder-concentration-percent')[0]
		).toHaveTextContent('30%');
		expect(
			screen.getByTestId('holder-concentration-others-percent')
		).toHaveTextContent('45%');
		expect(
			screen.getByTestId('holder-concentration-warning')
		).toHaveTextContent('Highly concentrated');
	});

	it('falls back to marketplace when the back button has no previous route entry', async () => {
		const user = userEvent.setup();
		mockGetCourse.mockResolvedValue({
			id: 'creator-123',
			title: 'Alex Rivers',
			description: 'Digital Artist & Illustrator',
			price: 0.05,
			priceStroops: 500_000,
			creatorShareSupply: 100,
			instructorId: 'arivers',
			category: 'Art',
			level: 'BEGINNER',
			creatorFeeBps: 500,
			protocolFeeBps: 250,
		});

		render(
			<QueryClientProvider client={queryClient}>
				<MemoryRouter initialEntries={['/creators/creator-123']}>
					<Routes>
						<Route path="/creators/:id" element={<CreatorDetailPage />} />
						<Route
							path="/creators"
							element={<div>Marketplace fallback</div>}
						/>
					</Routes>
				</MemoryRouter>
			</QueryClientProvider>
		);

		await user.click(
			await screen.findByRole('button', { name: /back to previous page/i })
		);

		expect(
			await screen.findByText('Marketplace fallback')
		).toBeInTheDocument();
	});

	it('updates the displayed price after a background refetch without flashing a loading skeleton', async () => {
		const initialCreator = {
			id: 'creator-123',
			title: 'Alex Rivers',
			description: 'Digital Artist & Illustrator',
			price: 100,
			priceStroops: 1_000_000_000,
			creatorShareSupply: 120,
			instructorId: 'arivers',
			category: 'Art',
			level: 'BEGINNER' as const,
			isVerified: true,
			thumbnail:
				'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
			creatorFeeBps: 500,
			protocolFeeBps: 250,
		};
		const updatedCreator = {
			...initialCreator,
			price: 150,
			priceStroops: 1_500_000_000,
		};
		const refetchDeferred = createDeferred<typeof updatedCreator>();

		mockGetCourse
			.mockResolvedValueOnce(initialCreator)
			.mockImplementationOnce(() => refetchDeferred.promise);

		render(
			<QueryClientProvider client={queryClient}>
				<MemoryRouter initialEntries={['/creators/creator-123']}>
					<Routes>
						<Route path="/creators/:id" element={<CreatorDetailPage />} />
					</Routes>
				</MemoryRouter>
			</QueryClientProvider>
		);

		expect(await screen.findByText('100.00 XLM')).toBeInTheDocument();
		expect(await screen.findAllByText('100.00 XLM')).not.toHaveLength(0);
		expect(
			screen.queryByLabelText(/loading creator profile/i)
		).not.toBeInTheDocument();

		await act(async () => {
			void queryClient.invalidateQueries({
				queryKey: queryKeys.creators.detail('creator-123'),
			});
		});

		expect(screen.getByText('100.00 XLM')).toBeInTheDocument();
		expect(screen.getAllByText('100.00 XLM')).not.toHaveLength(0);
		expect(
			screen.queryByLabelText(/loading creator profile/i)
		).not.toBeInTheDocument();

		refetchDeferred.resolve(updatedCreator);

		expect(await screen.findAllByText('150.00 XLM')).not.toHaveLength(0);
		expect(screen.queryAllByText('100.00 XLM')).toHaveLength(0);
	});

	it('renders a creator-not-found state for a 404 response on the canonical /creator route', async () => {
		mockGetCourse.mockRejectedValue(
			new ApiError('Creator not found', 404, {
				success: false,
				message: 'Creator not found',
			})
		);

		render(
			<QueryClientProvider client={queryClient}>
				<MemoryRouter initialEntries={['/creator/unknown-id']}>
					<Routes>
						<Route path="/creator/:id" element={<CreatorDetailPage />} />
						<Route path="/creators" element={<div>Creators list</div>} />
					</Routes>
				</MemoryRouter>
			</QueryClientProvider>
		);

		expect(
			await screen.findByRole('heading', { name: 'Creator not found' })
		).toBeInTheDocument();
		expect(
			screen.getByText(/we couldn't find a creator with that id/i)
		).toBeInTheDocument();
		expect(
			screen.getByRole('link', { name: /back to creators/i })
		).toHaveAttribute('href', '/creators');

		expect(
			screen.queryByLabelText(/loading creator profile/i)
		).not.toBeInTheDocument();
		expect(
			screen.queryByText(/this creator page could not load/i)
		).not.toBeInTheDocument();
	});

	it('shows early access only when enabled and gates buys by wallet whitelist', async () => {
		const walletAddress =
			'GABCDE1234567890ABCDE1234567890ABCDE1234567890ABCDEF';
		mockUseAccount.mockReturnValue({ address: walletAddress } as ReturnType<
			typeof useAccount
		>);
		const creator = {
			id: 'creator-123',
			title: 'Alex Rivers',
			description: 'Digital Artist & Illustrator',
			price: 0.05,
			priceStroops: 500_000,
			creatorShareSupply: 100,
			instructorId: 'arivers',
			category: 'Art',
			level: 'BEGINNER' as const,
			earlyAccessEnabled: true,
			earlyAccessWhitelist: [
				'GOTHER1234567890ABCDE1234567890ABCDE1234567890ABCDEF',
			],
		};
		mockGetCourse.mockResolvedValue(creator);

		render(
			<QueryClientProvider client={queryClient}>
				<MemoryRouter initialEntries={['/creator/creator-123']}>
					<Routes>
						<Route path="/creator/:id" element={<CreatorDetailPage />} />
					</Routes>
				</MemoryRouter>
			</QueryClientProvider>
		);

		expect(
			await screen.findByTestId('early-access-badge')
		).toBeInTheDocument();
		const buyButton = screen.getByTestId('creator-buy-button');
		expect(buyButton).toBeDisabled();
		expect(screen.getByRole('tooltip')).toHaveTextContent(
			'Your wallet is not on the whitelist'
		);

		act(() => {
			queryClient.setQueryData(queryKeys.creators.detail('creator-123'), {
				...creator,
				earlyAccessWhitelist: [walletAddress.toLowerCase()],
			});
		});
		await waitFor(() => expect(buyButton).toBeEnabled());
	});

	it('shows the configured public launch date and removes early access badge when disabled', async () => {
		mockGetCourse.mockResolvedValue({
			id: 'creator-123',
			title: 'Alex Rivers',
			description: 'Digital Artist & Illustrator',
			price: 0.05,
			priceStroops: 500_000,
			creatorShareSupply: 100,
			instructorId: 'arivers',
			category: 'Art',
			level: 'BEGINNER',
			earlyAccessEnabled: false,
			publicLaunchDate: '2030-01-01T12:00:00.000Z',
		});

		render(
			<QueryClientProvider client={queryClient}>
				<MemoryRouter initialEntries={['/creator/creator-123']}>
					<Routes>
						<Route path="/creator/:id" element={<CreatorDetailPage />} />
					</Routes>
				</MemoryRouter>
			</QueryClientProvider>
		);

		expect(await screen.findByText(/public launch:/i)).toBeInTheDocument();
		expect(
			screen.queryByTestId('early-access-badge')
		).not.toBeInTheDocument();
	});

	it('persists an early access mode change from the creator settings panel', async () => {
		const user = userEvent.setup();
		const creator = {
			id: 'creator-123',
			title: 'Alex Rivers',
			description: 'Digital Artist & Illustrator',
			price: 0.05,
			priceStroops: 500_000,
			creatorShareSupply: 100,
			instructorId: 'arivers',
			category: 'Art',
			level: 'BEGINNER' as const,
			earlyAccessEnabled: false,
		};
		mockGetCourse.mockResolvedValue(creator);
		mockUpdateCourse.mockResolvedValue({
			...creator,
			earlyAccessEnabled: true,
		});

		render(
			<QueryClientProvider client={queryClient}>
				<MemoryRouter
					initialEntries={['/creators/creator-123/dashboard?tab=settings']}
				>
					<Routes>
						<Route
							path="/creators/:id/dashboard"
							element={<CreatorDashboardPage />}
						/>
					</Routes>
				</MemoryRouter>
			</QueryClientProvider>
		);

		const toggle = await screen.findByRole('checkbox', {
			name: 'Enable early access',
		});
		await user.click(toggle);

		expect(mockUpdateCourse).toHaveBeenCalledWith('creator-123', {
			earlyAccessEnabled: true,
		});
		expect(
			await screen.findByText(/only whitelisted wallets can buy/i)
		).toBeInTheDocument();
	});
});
