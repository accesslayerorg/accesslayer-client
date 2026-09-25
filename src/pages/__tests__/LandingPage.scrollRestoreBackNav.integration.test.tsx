/**
 * Scroll and page restoration on back navigation (#639).
 *
 * The creator list already persists page/scroll state to sessionStorage
 * (see CREATOR_PAGE_KEY / CREATOR_SCROLL_KEY in LandingPage.tsx) and
 * restores it on mount. This test drives that contract through an actual
 * route change — navigating to a creator profile and back — rather than
 * only asserting the storage keys directly, so a regression in the mount
 * lifecycle (e.g. restore effect firing too early/late) would be caught.
 */
import type { ComponentProps, ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LandingPage from '@/pages/LandingPage';
import CreatorDetailPage from '@/pages/CreatorDetailPage';
import { courseService, type Course } from '@/services/course.service';

vi.mock('@/services/course.service', () => ({
	courseService: { getCourses: vi.fn() },
}));

vi.mock('@/hooks/useCreators', () => ({
	useCreatorDetail: () => ({
		data: {
			id: '1',
			title: 'Creator A',
			description: 'Bio',
			isVerified: true,
			creatorFeeBps: 100,
			protocolFeeBps: 50,
		},
		isLoading: false,
		error: null,
	}),
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

function makeQueryClient() {
	return new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
}

const mockGetCourses = vi.mocked(courseService.getCourses);

function createCreator(id: string, title: string): Course {
	return {
		id,
		title,
		description: `Description for ${title}`,
		price: 0.1,
		priceStroops: 1_000_000,
		creatorShareSupply: 100,
		instructorId: title.toLowerCase().replace(/\s+/g, '-'),
		category: 'Art',
		level: 'BEGINNER',
		isVerified: true,
	};
}

const ALL_CREATORS = Array.from({ length: 7 }, (_, i) =>
	createCreator(String(i + 1), `Creator ${String.fromCharCode(65 + i)}`)
);

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

const getCreatorTitles = () =>
	screen.getAllByRole('article').map(node => node.textContent);

// Newer Node versions expose a global WebStorage `localStorage` that
// shadows jsdom's and has no working methods; install a spec-compliant
// in-memory stub so this suite behaves identically on every Node version
// (see LandingPage.sellFlow.integration.test.tsx, #644).
const installStorageStub = (property: 'localStorage' | 'sessionStorage') => {
	const store = new Map<string, string>();
	Object.defineProperty(window, property, {
		configurable: true,
		writable: true,
		value: {
			getItem: (key: string) => store.get(String(key)) ?? null,
			setItem: (key: string, value: string) => {
				store.set(String(key), String(value));
			},
			removeItem: (key: string) => {
				store.delete(String(key));
			},
			clear: () => store.clear(),
			key: (index: number) => Array.from(store.keys())[index] ?? null,
			get length() {
				return store.size;
			},
		},
	});
};

describe('LandingPage scroll/page restore on back navigation (#639)', () => {
	beforeEach(() => {
		mockMatchMedia();
		installStorageStub('localStorage');
		installStorageStub('sessionStorage');
		window.localStorage.setItem('accesslayer.creator-list-mode', 'infinite');
		mockGetCourses.mockReset();
		mockGetCourses.mockResolvedValue(ALL_CREATORS);
		Object.defineProperty(window, 'scrollY', {
			writable: true,
			configurable: true,
			value: 0,
		});
		window.scrollTo = vi.fn(({ top }: { top: number }) => {
			Object.defineProperty(window, 'scrollY', {
				writable: true,
				configurable: true,
				value: top,
			});
		}) as typeof window.scrollTo;
	});

	function renderApp() {
		const router = createMemoryRouter(
			[
				{ path: '/', element: <LandingPage /> },
				{ path: '/creator/:id', element: <CreatorDetailPage /> },
			],
			{ initialEntries: ['/'] }
		);
		const queryClient = makeQueryClient();
		render(
			<QueryClientProvider client={queryClient}>
				<RouterProvider router={router} />
			</QueryClientProvider>
		);
		return router;
	}

	it('keeps page 2 results and restores scroll position after navigating to a profile and back', async () => {
		const router = renderApp();

		await waitFor(() => {
			expect(getCreatorTitles()).toHaveLength(6);
		});

		const loadMoreButton = await screen.findByRole('button', {
			name: /load more creators/i,
		});
		fireEvent.click(loadMoreButton);

		await waitFor(() => {
			expect(getCreatorTitles()).toHaveLength(7);
		});

		fireEvent.scroll(window, { target: { scrollY: 850 } });
		Object.defineProperty(window, 'scrollY', {
			writable: true,
			configurable: true,
			value: 850,
		});
		fireEvent.scroll(window);

		await waitFor(() => {
			expect(window.sessionStorage.getItem('accesslayer.creator-scrollY')).toBe(
				'850'
			);
		});

		router.navigate('/creator/1');
		await waitFor(() => {
			expect(
				screen.getByRole('heading', { name: /Creator A/i, level: 1 })
			).toBeInTheDocument();
		});

		router.navigate('/');

		await waitFor(() => {
			expect(screen.queryAllByRole('article').length).toBeGreaterThan(0);
		});
		await waitFor(() => {
			expect(getCreatorTitles()).toHaveLength(7);
		});
		expect(getCreatorTitles()).toEqual([
			'Creator A',
			'Creator B',
			'Creator C',
			'Creator D',
			'Creator E',
			'Creator F',
			'Creator G',
		]);

		await waitFor(() => {
			expect(window.scrollTo).toHaveBeenCalledWith(
				expect.objectContaining({ top: 850 })
			);
		});

		expect(mockGetCourses).not.toHaveBeenCalledTimes(3);
	});
});
