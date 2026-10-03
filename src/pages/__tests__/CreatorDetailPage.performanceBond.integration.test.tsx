import type { ComponentProps, ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router';
import CreatorDetailPage from '@/pages/CreatorDetailPage';
import { courseService, type PerformanceBond } from '@/services/course.service';

vi.mock('@/services/course.service', () => ({
	courseService: {
		getCourse: vi.fn(),
		getHoldersPage: vi.fn(),
		getPerformanceBond: vi.fn(),
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
const mockGetHoldersPage = vi.mocked(courseService.getHoldersPage);
const mockGetPerformanceBond = vi.mocked(courseService.getPerformanceBond);

function makeFreshQueryClient() {
	return new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
}

function renderCreatorDetailPage(keyId = 'creator-123') {
	const queryClient = makeFreshQueryClient();
	return render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter initialEntries={[`/creators/${keyId}`]}>
				<Routes>
					<Route path="/creators/:id" element={<CreatorDetailPage />} />
				</Routes>
			</MemoryRouter>
		</QueryClientProvider>
	);
}

describe('CreatorDetailPage Performance Bond Integration', () => {
	let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

	const mockBaseCourse = {
		id: 'creator-123',
		title: 'Satoshi Nakamoto',
		description: 'Blockchain Architect',
		price: 1.5,
		priceStroops: 15_000_000,
		creatorShareSupply: 500,
		instructorId: 'satoshin',
		category: 'Crypto',
		level: 'ADVANCED' as const,
		isVerified: true,
	};

	beforeEach(() => {
		mockGetCourse.mockReset();
		mockGetHoldersPage.mockReset();
		mockGetPerformanceBond.mockReset();

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

	it('renders performance bond panel when key has an active performance bond', async () => {
		mockGetCourse.mockResolvedValue(mockBaseCourse);
		const mockBond: PerformanceBond = {
			keyId: 'creator-123',
			amountStroops: 50_000_000_000, // 5000 XLM
			state: 'staked',
			milestone: '1,000 Keys Sold',
		};
		mockGetPerformanceBond.mockResolvedValue(mockBond);

		renderCreatorDetailPage();

		expect(await screen.findByText('Satoshi Nakamoto Profile')).toBeInTheDocument();

		await waitFor(() => {
			expect(screen.getByTestId('performance-bond-panel')).toBeInTheDocument();
		});

		expect(screen.getByTestId('performance-bond-amount')).toHaveTextContent('5,000 XLM');
		expect(screen.getByTestId('performance-bond-state')).toHaveTextContent('Staked');
		expect(screen.getByTestId('performance-bond-milestone')).toHaveTextContent('1,000 Keys Sold');
	});

	it('does NOT render performance bond panel when key has no performance bond', async () => {
		mockGetCourse.mockResolvedValue(mockBaseCourse);
		mockGetPerformanceBond.mockResolvedValue(null);

		renderCreatorDetailPage();

		expect(await screen.findByText('Satoshi Nakamoto Profile')).toBeInTheDocument();

		await waitFor(() => {
			expect(mockGetPerformanceBond).toHaveBeenCalledWith('creator-123');
		});

		expect(
			screen.queryByTestId('performance-bond-panel')
		).not.toBeInTheDocument();
	});

	it('renders forfeited state with reason clearly on key detail page', async () => {
		mockGetCourse.mockResolvedValue(mockBaseCourse);
		const mockBond: PerformanceBond = {
			keyId: 'creator-123',
			amountStroops: 10_000_000_000,
			state: 'forfeited',
			milestone: '500 Active Holders',
			forfeitureReason: 'Failed to fulfill content delivery agreement within 90 days.',
		};
		mockGetPerformanceBond.mockResolvedValue(mockBond);

		renderCreatorDetailPage();

		await waitFor(() => {
			expect(screen.getByTestId('performance-bond-panel')).toBeInTheDocument();
		});

		expect(screen.getByTestId('performance-bond-state')).toHaveTextContent('Forfeited');
		expect(screen.getByTestId('performance-bond-reason')).toHaveTextContent(
			'Failed to fulfill content delivery agreement within 90 days.'
		);
	});

	it('renders released state with timestamp clearly on key detail page', async () => {
		mockGetCourse.mockResolvedValue(mockBaseCourse);
		const mockBond: PerformanceBond = {
			keyId: 'creator-123',
			amountXlm: 2500,
			state: 'released',
			milestone: '1,000 Keys Sold',
			releasedAt: '2026-09-01T10:00:00Z',
		};
		mockGetPerformanceBond.mockResolvedValue(mockBond);

		renderCreatorDetailPage();

		await waitFor(() => {
			expect(screen.getByTestId('performance-bond-panel')).toBeInTheDocument();
		});

		expect(screen.getByTestId('performance-bond-state')).toHaveTextContent('Released');
		const releaseEl = screen.getByTestId('performance-bond-released-at');
		expect(releaseEl).toBeInTheDocument();
		expect(releaseEl).toHaveTextContent(/Sep 1, 2026/i);
	});
});
