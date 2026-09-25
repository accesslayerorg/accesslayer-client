/**
 * Integration tests for the sell key confirmation modal's mutation-outcome
 * behavior (#692): the confirm button is disabled while the sell is
 * pending, and the modal stays open with an inline error toast when the
 * sell fails, rather than closing as if it had succeeded.
 *
 * Complements LandingPage.sellFlow.integration.test.tsx (success path) and
 * TradeDialog.sellPayoutDisplay.test.tsx (payout display, bonding curve
 * call, disabled-prop unit coverage) — this file covers the two mutation
 * outcomes that require the full LandingPage wiring (handleConfirmTrade),
 * since TradeDialog itself has no mutation or toast logic of its own.
 */
import type { ComponentProps, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

describe('Sell confirmation modal mutation outcomes (#692)', () => {
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

	it('disables the confirm button while the sell is pending and re-enables it once settled', async () => {
		renderLandingPage();
		await screen.findByText('3 keys · 0.05 XLM');

		const [sellButton] = screen.getAllByRole('button', { name: 'Sell' });
		fireEvent.click(sellButton);

		const amountInput = await screen.findByTestId('trade-dialog-amount');
		fireEvent.change(amountInput, { target: { value: '1' } });

		const confirmButton = screen.getByTestId('trade-dialog-confirm');
		expect(confirmButton).not.toBeDisabled();

		fireEvent.click(confirmButton);

		// Still mid-flight (sell's simulated confirmation takes ~900ms+250ms) —
		// the button must be disabled so a second click can't double-submit.
		expect(screen.getByTestId('trade-dialog-confirm')).toBeDisabled();

		await waitFor(
			() => expect(mockShowToast.transactionSuccess).toHaveBeenCalled(),
			{ timeout: 5000 }
		);
	});

	it('keeps the modal open and shows an inline error toast when the sell fails, instead of closing as if it succeeded', async () => {
		// showToast.loading is the first call inside handleConfirmTrade's sell
		// branch; making it throw exercises the real catch block exactly as a
		// genuine rendering/toast-library failure would, without needing the
		// sell path (which doesn't go through tradeMutation) to have a
		// separate fake failure mode invented for the test.
		mockShowToast.loading.mockImplementationOnce(() => {
			throw new Error('simulated toast failure');
		});

		renderLandingPage();
		await screen.findByText('3 keys · 0.05 XLM');

		const [sellButton] = screen.getAllByRole('button', { name: 'Sell' });
		fireEvent.click(sellButton);

		const amountInput = await screen.findByTestId('trade-dialog-amount');
		fireEvent.change(amountInput, { target: { value: '1' } });
		fireEvent.click(screen.getByTestId('trade-dialog-confirm'));

		await waitFor(() => {
			expect(mockShowToast.error).toHaveBeenCalledWith(
				'The signature request failed. Please ensure your wallet is unlocked and try again.'
			);
		});

		// The modal must still be open (not closed as though the sell succeeded).
		expect(screen.getByTestId('trade-dialog-amount')).toBeInTheDocument();
		expect(screen.getByTestId('trade-dialog-confirm')).toBeInTheDocument();

		// Holdings must be unchanged — a failed sell must not decrement the balance.
		expect(screen.getByText('3 keys · 0.05 XLM')).toBeInTheDocument();

		// No success toast fired for the failed attempt.
		expect(mockShowToast.transactionSuccess).not.toHaveBeenCalled();

		// The confirm button is re-enabled after the failure settles, so the
		// user can retry rather than being stuck on a disabled button.
		await waitFor(() => {
			expect(screen.getByTestId('trade-dialog-confirm')).not.toBeDisabled();
		});
	});
});
