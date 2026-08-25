import type { ComponentProps, ReactNode } from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router';
import CreatorDetailPage from '@/pages/CreatorDetailPage';
import { courseService } from '@/services/course.service';
import { ApiError } from '@/services/api.service';
import { queryKeys } from '@/lib/queryKeys';

vi.mock('@/services/course.service', () => ({
	courseService: {
		getCourse: vi.fn(),
		getPriceHistory: vi.fn(),
	},
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
		expect(
			screen.queryByLabelText(/loading creator profile/i)
		).not.toBeInTheDocument();

		await act(async () => {
			void queryClient.invalidateQueries({
				queryKey: queryKeys.creators.detail('creator-123'),
			});
		});

		expect(screen.getByText('100.00 XLM')).toBeInTheDocument();
		expect(
			screen.queryByLabelText(/loading creator profile/i)
		).not.toBeInTheDocument();

		refetchDeferred.resolve(updatedCreator);

		expect(await screen.findByText('150.00 XLM')).toBeInTheDocument();
		expect(screen.queryByText('100.00 XLM')).not.toBeInTheDocument();
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
});
