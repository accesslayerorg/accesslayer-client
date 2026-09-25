import type { ComponentProps, ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LandingPage from '@/pages/LandingPage';
import { courseService, type Course } from '@/services/course.service';

vi.mock('@/services/course.service', () => ({
	courseService: { getCourses: vi.fn() },
}));

function makeQueryClient() {
	return new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
}

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

const CREATOR_A = createCreator('1', 'Creator A');
const CREATOR_B = createCreator('2', 'Creator B');
const CREATOR_C = createCreator('3', 'Creator C');
const CREATOR_D = createCreator('4', 'Creator D');
const CREATOR_E = createCreator('5', 'Creator E');
const CREATOR_F = createCreator('6', 'Creator F');
const CREATOR_G = createCreator('7', 'Creator G');

const ALL_CREATORS = [
	CREATOR_A,
	CREATOR_B,
	CREATOR_C,
	CREATOR_D,
	CREATOR_E,
	CREATOR_F,
	CREATOR_G,
];

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

describe('Infinite scroll non-duplication (#651)', () => {
	beforeEach(() => {
		mockMatchMedia();
		window.localStorage.clear();
		window.sessionStorage.clear();
		window.localStorage.setItem('accesslayer.creator-list-mode', 'infinite');
		mockGetCourses.mockReset();
		mockGetCourses.mockResolvedValue(ALL_CREATORS);
	});

	function renderPage() {
		return render(
			<QueryClientProvider client={makeQueryClient()}>
				<MemoryRouter>
					<LandingPage />
				</MemoryRouter>
			</QueryClientProvider>
		);
	}

	it('appends new creators without duplicating existing ones when loading the next page', async () => {
		renderPage();

		await waitFor(() => {
			expect(getCreatorTitles()).toEqual([
				'Creator A',
				'Creator B',
				'Creator C',
				'Creator D',
				'Creator E',
				'Creator F',
			]);
		});

		const loadMoreButton = await screen.findByRole('button', {
			name: /load more creators/i,
		});
		fireEvent.click(loadMoreButton);

		await waitFor(() => {
			expect(getCreatorTitles()).toEqual([
				'Creator A',
				'Creator B',
				'Creator C',
				'Creator D',
				'Creator E',
				'Creator F',
				'Creator G',
			]);
		});

		const allCards = screen.getAllByRole('article');
		const titles = allCards.map(card => card.textContent);
		const uniqueTitles = new Set(titles);

		expect(titles).toHaveLength(7);
		expect(uniqueTitles.size).toBe(7);

		expect(
			screen.queryByRole('button', { name: /load more creators/i })
		).not.toBeInTheDocument();
	});

	it('keeps page 1 creators visible after page 2 loads without clearing previous results', async () => {
		renderPage();

		await waitFor(() => {
			expect(getCreatorTitles()).toHaveLength(6);
		});

		expect(getCreatorTitles()).toContain('Creator A');
		expect(getCreatorTitles()).toContain('Creator B');
		expect(getCreatorTitles()).toContain('Creator C');

		const loadMoreButton = await screen.findByRole('button', {
			name: /load more creators/i,
		});
		fireEvent.click(loadMoreButton);

		await waitFor(() => {
			expect(getCreatorTitles()).toHaveLength(7);
		});

		expect(getCreatorTitles()).toContain('Creator A');
		expect(getCreatorTitles()).toContain('Creator B');
		expect(getCreatorTitles()).toContain('Creator C');
		expect(getCreatorTitles()).toContain('Creator D');
		expect(getCreatorTitles()).toContain('Creator E');
		expect(getCreatorTitles()).toContain('Creator F');
	});
});
