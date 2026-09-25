import type { ComponentProps, ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LandingPage from '@/pages/LandingPage';
import { courseService, type Course } from '@/services/course.service';

vi.mock('@/hooks/useWallet', () => ({
	useTradeMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
	useWalletHoldings: () => ({ data: [] }),
}));

vi.mock('@/services/course.service', () => ({
	courseService: { getCourses: vi.fn() },
}));

vi.mock('@/hooks/useNetworkMismatch', () => ({
	useNetworkMismatch: () => ({
		isMismatch: false,
		expectedChainName: 'Stellar Testnet',
	}),
}));

vi.mock('@/hooks/useStaleData', () => ({
	useStaleData: () => ({
		stale: false,
		ageMs: 0,
		msUntilStale: 60_000,
		revalidate: vi.fn(),
	}),
}));

vi.mock('@/components/common/StellarConnectionQualityBadge', async () => {
	const React = await import('react');
	return {
		default: () => React.createElement('div', { role: 'status' }, 'RPC good'),
	};
});

vi.mock('@/components/common/CreatorCard', async () => {
	const React = await import('react');
	return {
		default: ({ creator }: { creator: { title: string } }) =>
			React.createElement(
				'article',
				{ 'aria-label': `Creator ${creator.title}` },
				creator.title
			),
	};
});

vi.mock('framer-motion', async () => {
	const React = await import('react');
	type MotionDivProps = ComponentProps<'div'> & {
		layout?: boolean;
		transition?: unknown;
	};
	return {
		AnimatePresence: ({ children }: { children: ReactNode }) =>
			React.createElement(React.Fragment, null, children),
		LayoutGroup: ({ children }: { children: ReactNode }) =>
			React.createElement(React.Fragment, null, children),
		motion: {
			div: ({ children, ...props }: MotionDivProps) => {
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

const mockGetCourses = vi.mocked(courseService.getCourses);

const creator: Course = {
	id: 'creator-a',
	title: 'Creator Alpha',
	description: 'Digital artist',
	price: 0.05,
	priceStroops: 500_000,
	creatorShareSupply: 100,
	instructorId: 'creator-a',
	category: 'Art',
	level: 'BEGINNER',
	isVerified: true,
};

const mockMatchMedia = () => {
	Object.defineProperty(window, 'matchMedia', {
		writable: true,
		value: vi.fn().mockImplementation((query: string) => ({
			matches: false,
			media: query,
			onchange: null,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			addListener: vi.fn(),
			removeListener: vi.fn(),
			dispatchEvent: vi.fn(),
		})),
	});
};

describe('LandingPage empty state integration (#452)', () => {
	beforeEach(() => {
		mockMatchMedia();
		window.localStorage.clear();
		window.sessionStorage.clear();
		mockGetCourses.mockReset();
	});

	it('renders the empty state when API returns zero creators and a search term is entered', async () => {
		mockGetCourses.mockResolvedValue([]);
		render(<MemoryRouter><LandingPage /></MemoryRouter>);
		await waitFor(() => expect(mockGetCourses).toHaveBeenCalledTimes(1));

		fireEvent.change(
			screen.getByPlaceholderText(/search creators by name or handle/i),
			{ target: { value: 'nobody' } }
		);

		expect(
			await screen.findByRole('status', { name: /no creators found/i })
		).toBeInTheDocument();
	});

	it('renders the empty state when no creators match the search query', async () => {
		mockGetCourses.mockResolvedValue([creator]);
		render(<MemoryRouter><LandingPage /></MemoryRouter>);
		await waitFor(() => expect(mockGetCourses).toHaveBeenCalledTimes(1));

		fireEvent.change(
			screen.getByPlaceholderText(/search creators by name or handle/i),
			{ target: { value: 'xyznotfound' } }
		);

		expect(
			await screen.findByRole('status', { name: /no creators found/i })
		).toBeInTheDocument();
	});

	it('clear button resets the search input, hides the empty state, and re-fetches the full list', async () => {
		mockGetCourses.mockResolvedValue([creator]);
		render(<MemoryRouter><LandingPage /></MemoryRouter>);
		await waitFor(() => expect(mockGetCourses).toHaveBeenCalledTimes(1));

		// Type a query that yields no matches
		fireEvent.change(
			screen.getByPlaceholderText(/search creators by name or handle/i),
			{ target: { value: 'xyznotfound' } }
		);
		await screen.findByRole('status', { name: /no creators found/i });

		// Click the "Reset Search" button rendered by EmptyState
		fireEvent.click(screen.getByRole('button', { name: /reset search/i }));

		// Empty state must disappear and the creator card must reappear
		await waitFor(() => {
			expect(
				screen.queryByRole('status', { name: /no creators found/i })
			).not.toBeInTheDocument();
		});
		expect(
			screen.getByRole('article', { name: /creator alpha/i })
		).toBeInTheDocument();

		// Search input must be cleared
		expect(
			screen.getByPlaceholderText(/search creators by name or handle/i)
		).toHaveValue('');
	});
});
