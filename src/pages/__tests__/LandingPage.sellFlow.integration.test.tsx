/**
 * End-to-end integration test for the sell flow (#644): from quantity input
 * through simulated on-chain confirmation to the success toast and updated
 * holdings.
 *
 * Mirrors the buy-flow E2E structure: the wallet layer is the app's real
 * demo wallet (react-query + useWallet, no hook mocks), seeded with the
 * default 3 keys for the featured creator; only external seams (course API,
 * toast sink, network badges, animation) are mocked.
 */
import type { ComponentProps, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('wagmi', () => ({
	useAccount: vi.fn(() => ({ address: undefined, isConnected: false })),
}));

import LandingPage from '@/pages/LandingPage';
import { courseService, type Course } from '@/services/course.service';
import showToast from '@/utils/toast.util';

vi.mock('@/services/course.service', () => ({
	courseService: { getCourses: vi.fn() },
}));

vi.mock('@/utils/toast.util', () => ({
	default: {
		message: vi.fn(),
		success: vi.fn(),
		error: vi.fn(),
		loading: vi.fn(),
		transactionSuccess: vi.fn(),
	},
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

vi.mock('@/components/common/FeaturedCreatorAudienceChip', async () => {
	const React = await import('react');

	return {
		FeaturedCreatorAudienceChip: () =>
			React.createElement('div', { 'data-testid': 'mock-audience-chip' }),
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
const mockShowToast = vi.mocked(showToast);

const featuredCreatorOnly: Course[] = [
	{
		id: '1',
		title: 'Alex Rivers',
		description: 'Digital Artist & Illustrator',
		price: 0.05,
		priceStroops: 500_000,
		creatorShareSupply: 120,
		instructorId: '1',
		category: 'Art',
		level: 'BEGINNER',
		isVerified: true,
	},
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

// Newer Node versions expose a global WebStorage `localStorage` that
// shadows jsdom's and has no working methods; install a spec-compliant
// in-memory stub so this suite behaves identically on every Node version.
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

const renderLandingPage = () =>
	render(
		<QueryClientProvider
			client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
		>
			<MemoryRouter>
				<LandingPage />
			</MemoryRouter>
		</QueryClientProvider>
	);

describe('LandingPage sell flow end-to-end (#644)', () => {
	beforeEach(() => {
		mockMatchMedia();
		installStorageStub('localStorage');
		installStorageStub('sessionStorage');
		mockGetCourses.mockReset();
		vi.clearAllMocks();
		mockGetCourses.mockResolvedValue(featuredCreatorOnly);
	});

	afterEach(() => {
		cleanup();
	});

	it('completes the sell flow from quantity input to success toast and updated holdings', async () => {
		renderLandingPage();

		// Wallet connected with 3 keys held for the featured creator
		await screen.findByText('3 keys · 0.05 XLM');

		// Open the trade panel on the sell side
		const [sellButton] = screen.getAllByRole('button', {
			name: 'Sell',
			hidden: true,
		});
		fireEvent.click(sellButton);

		// Enter quantity 2
		const amountInput = await screen.findByTestId('trade-dialog-amount');
		fireEvent.change(amountInput, { target: { value: '2' } });

		// Submit and wait through the simulated on-chain confirmation
		fireEvent.click(screen.getByTestId('trade-dialog-confirm'));

		await waitFor(
			() =>
				expect(mockShowToast.transactionSuccess).toHaveBeenCalledWith(
					'Trade confirmed',
					'Sold 2 keys from Alex Rivers'
				),
			{ timeout: 5000 }
		);

		// Holdings cache reflects 1 remaining key
		await waitFor(
			() => expect(screen.getByText('1 keys · 0.05 XLM')).toBeInTheDocument(),
			{ timeout: 5000 }
		);
		expect(screen.queryByText('3 keys · 0.05 XLM')).toBeNull();

		// No error state at any stage of the flow
		expect(mockShowToast.error).not.toHaveBeenCalled();
	}, 15000);

	it('reports the submitted quantity while the transaction is pending', async () => {
		renderLandingPage();
		await screen.findByText('3 keys · 0.05 XLM');

		const [sellButton] = screen.getAllByRole('button', {
			name: 'Sell',
			hidden: true,
		});
		fireEvent.click(sellButton);
		fireEvent.change(await screen.findByTestId('trade-dialog-amount'), {
			target: { value: '2' },
		});
		fireEvent.click(screen.getByTestId('trade-dialog-confirm'));

		expect(mockShowToast.loading).toHaveBeenCalledWith(
			'Submitting sell for 2 keys...'
		);
	}, 15000);

	it('uses the singular key wording when selling exactly one', async () => {
		renderLandingPage();
		await screen.findByText('3 keys · 0.05 XLM');

		const [sellButton] = screen.getAllByRole('button', {
			name: 'Sell',
			hidden: true,
		});
		fireEvent.click(sellButton);
		fireEvent.change(await screen.findByTestId('trade-dialog-amount'), {
			target: { value: '1' },
		});
		fireEvent.click(screen.getByTestId('trade-dialog-confirm'));

		await waitFor(
			() =>
				expect(mockShowToast.transactionSuccess).toHaveBeenCalledWith(
					'Trade confirmed',
					'Sold 1 key from Alex Rivers'
				),
			{ timeout: 5000 }
		);
	}, 15000);

	it('is keyboard accessible end-to-end (#722): focuses the amount input on open, closes on Escape, and returns focus to the Sell button', async () => {
		renderLandingPage();
		await screen.findByText('3 keys · 0.05 XLM');

		const [sellButton] = screen.getAllByRole('button', {
			name: 'Sell',
			hidden: true,
		});
		sellButton.focus();
		fireEvent.click(sellButton);

		await waitFor(() => {
			expect(screen.getByTestId('trade-dialog-amount')).toHaveFocus();
		});

		fireEvent.keyDown(document.activeElement as Element, { key: 'Escape' });

		await waitFor(() => {
			expect(sellButton).toHaveFocus();
		});

		expect(screen.queryByTestId('trade-dialog-amount')).not.toBeInTheDocument();
	}, 15000);
});
