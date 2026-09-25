import type { ComponentProps, ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LandingPage from '@/pages/LandingPage';
import { courseService, type Course } from '@/services/course.service';

vi.mock('@/hooks/useWallet', () => ({
	useTradeMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
	useWalletHoldings: () => ({ data: [] }),
}));

vi.mock('@/services/course.service', () => ({
	courseService: {
		getCourses: vi.fn(),
	},
}));

vi.mock('@/hooks/useNetworkMismatch', () => ({
	useNetworkMismatch: () => ({
		isMismatch: false,
		expectedChainName: 'Stellar Testnet',
	}),
}));

// Prevent the stale-data hook from triggering a background re-fetch on mount
// (creatorsFetchedAt starts as null → stale=true on first render, which fires
// onStale → re-fetch → resets isLoading=true → delays the portfolio display).
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

const mockGetCourses = vi.mocked(courseService.getCourses);

// Two seeded creators at known prices:
//   Creator A (index 0 → featuredHoldings = 3): priceStroops 500_000
//     → 3 × 500_000 = 1_500_000 stroops = 0.15 XLM per position
//   Creator B (index 1 → DEMO_HELD_KEY_QUANTITIES[1] = 2): priceStroops 1_200_000
//     → 2 × 1_200_000 = 2_400_000 stroops = 0.24 XLM per position
//   Total: 3_900_000 stroops = 0.39 XLM
const seededCreators: Course[] = [
	{
		id: 'creator-a',
		title: 'Creator A',
		description: 'Digital artist',
		price: 0.05,
		priceStroops: 500_000,
		creatorShareSupply: 100,
		instructorId: 'creator-a',
		category: 'Art',
		level: 'BEGINNER',
		isVerified: true,
	},
	{
		id: 'creator-b',
		title: 'Creator B',
		description: 'Developer',
		price: 0.12,
		priceStroops: 1_200_000,
		creatorShareSupply: 50,
		instructorId: 'creator-b',
		category: 'Tech',
		level: 'ADVANCED',
		isVerified: false,
	},
];

describe('LandingPage wallet holdings', () => {
	beforeEach(() => {
		mockMatchMedia();
		window.localStorage.clear();
		window.sessionStorage.clear();
		mockGetCourses.mockReset();
	});

	it('displays total portfolio value equal to the sum of all held positions', async () => {
		mockGetCourses.mockResolvedValue(seededCreators);
		render(<MemoryRouter><LandingPage /></MemoryRouter>);

		// 3 × 500_000 + 2 × 1_200_000 = 3_900_000 stroops = 0.39 XLM
		expect(await screen.findByText('0.39 XLM')).toBeInTheDocument();
	});

	it('shows each holding card with the correct per-key price', async () => {
		mockGetCourses.mockResolvedValue(seededCreators);
		render(<MemoryRouter><LandingPage /></MemoryRouter>);

		// Wait for the portfolio total to load (past the 800 ms loading skeleton)
		await screen.findByText('0.39 XLM');

		// Holdings grid shows "N keys · price" text unique to each card
		// Creator A: 3 × 500_000 stroops → 0.05 XLM/key
		expect(screen.getByText('3 keys · 0.05 XLM')).toBeInTheDocument();
		// Creator B: 2 × 1_200_000 stroops → 0.12 XLM/key
		expect(screen.getByText('2 keys · 0.12 XLM')).toBeInTheDocument();
	});

	it('shows the correct total and helper text for a single held position', async () => {
		const singleCreator = [
			{
				id: 'solo',
				title: 'Solo Creator',
				description: 'Solo',
				price: 0.1,
				priceStroops: 1_000_000,
				creatorShareSupply: 50,
				instructorId: 'solo',
				category: 'Art',
				level: 'BEGINNER' as const,
			},
		];
		mockGetCourses.mockResolvedValue(singleCreator);
		render(<MemoryRouter><LandingPage /></MemoryRouter>);

		// 3 (featuredHoldings) × 1_000_000 stroops = 3_000_000 stroops = 0.3 XLM
		expect(await screen.findByText('0.3 XLM')).toBeInTheDocument();
		expect(
			screen.getByText('Across 1 held creator position.')
		).toBeInTheDocument();
	});
});
