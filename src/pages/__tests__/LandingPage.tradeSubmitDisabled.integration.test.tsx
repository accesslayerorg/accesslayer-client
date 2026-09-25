/**
 * Integration test for trade panel submit button being disabled while a
 * transaction is in flight (#622).
 *
 * While a buy or sell transaction is pending on-chain, the submit button
 * should be disabled to prevent duplicate submissions. The test confirms:
 *   - The submit button is disabled immediately after submission
 *   - The submit button is re-enabled after the transaction confirms
 *   - The submit button is re-enabled after the transaction fails
 *   - No duplicate submission is possible while the button is disabled
 */
import type { ComponentProps, ReactNode } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LandingPage from '@/pages/LandingPage';
import { courseService } from '@/services/course.service';

// ---------------------------------------------------------------------------
// Deferred promise helpers — lets us control when mutateAsync settles so we
// can observe the in-flight disabled state of the confirm button.
// ---------------------------------------------------------------------------
let mutationResolve: ((value: { success: true }) => void) | null = null;
let mutationReject: ((reason: Error) => void) | null = null;

function createControllableMutation(): Promise<{ success: true }> {
	return new Promise<{ success: true }>((resolve, reject) => {
		mutationResolve = resolve;
		mutationReject = reject;
	});
}

// ---------------------------------------------------------------------------
// Module mocks — mirror the pattern from other LandingPage integration tests
// ---------------------------------------------------------------------------

vi.mock('@/hooks/useWallet', () => ({
	useTradeMutation: () => ({
		mutateAsync: vi.fn().mockImplementation(() => createControllableMutation()),
		isPending: false,
	}),
	useWalletHoldings: () => ({ data: [] }),
}));

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

const singleCreator: Array<{
	id: string;
	title: string;
	description: string;
	price: number;
	priceStroops: number;
	creatorShareSupply: number;
	instructorId: string;
	category: string;
	level: string;
	isVerified: boolean;
	thumbnail: string;
}> = [
	{
		id: '1',
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
	},
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Opens the trade dialog by clicking a Buy button, sets the amount, and
 * clicks the confirm button. Returns the confirm button element so tests
 * can assert on its disabled state.
 */
async function submitBuyTrade(user: ReturnType<typeof userEvent.setup>, amount: number) {
	const buyButtons = await screen.findAllByRole('button', {
		name: 'Buy',
	});
	await user.click(buyButtons[0]);

	const amountInput = await screen.findByTestId('trade-dialog-amount');
	await user.clear(amountInput);
	await user.type(amountInput, String(amount));

	const confirmButton = screen.getByTestId('trade-dialog-confirm');
	await user.click(confirmButton);

	return confirmButton;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LandingPage trade submit button disabled while transaction in flight (#622)', () => {
	beforeEach(() => {
		mockMatchMedia();
		window.localStorage.clear();
		window.sessionStorage.clear();
		mockGetCourses.mockReset();
		vi.clearAllMocks();

		// Reset deferred promise hooks
		mutationResolve = null;
		mutationReject = null;
	});

	afterEach(() => {
		cleanup();
	});

	it('disables the submit button immediately after submission while the transaction is pending', async () => {
		const user = userEvent.setup();
		mockGetCourses.mockResolvedValue(singleCreator);

		render(
			<MemoryRouter>
				<LandingPage />
			</MemoryRouter>
		);

		// Wait for the page to finish loading
		await waitFor(() => expect(mockGetCourses).toHaveBeenCalledTimes(1));

		// Submit a buy trade — the mutation will hang because our mock never resolves
		const confirmButton = await submitBuyTrade(user, 5);

		// The confirm button should be disabled while the transaction is in flight
		await waitFor(() => {
			expect(confirmButton).toBeDisabled();
		});
	});

	it('re-enables the submit button after the transaction confirms', async () => {
		const user = userEvent.setup();
		mockGetCourses.mockResolvedValue(singleCreator);

		render(
			<MemoryRouter>
				<LandingPage />
			</MemoryRouter>
		);

		await waitFor(() => expect(mockGetCourses).toHaveBeenCalledTimes(1));

		// Submit a buy trade — hangs on our mock
		const confirmButton = await submitBuyTrade(user, 5);

		// Assert disabled while pending
		await waitFor(() => {
			expect(confirmButton).toBeDisabled();
		});

		// Resolve the transaction
		expect(mutationResolve).not.toBeNull();
		mutationResolve!({ success: true });

		// The dialog should close after confirmation, and the Buy button should
		// be re-enabled (accessible again for a new trade).
		await waitFor(
			() => {
				expect(screen.queryByRole('dialog')).toBeNull();
			},
			{ timeout: 3000 }
		);

		// Confirm a fresh Buy button is not disabled
		const buyButtons = screen.getAllByRole('button', { name: 'Buy' });
		expect(buyButtons[0]).not.toBeDisabled();
	});

	it('re-enables the submit button after the transaction fails', async () => {
		const user = userEvent.setup();
		mockGetCourses.mockResolvedValue(singleCreator);

		render(
			<MemoryRouter>
				<LandingPage />
			</MemoryRouter>
		);

		await waitFor(() => expect(mockGetCourses).toHaveBeenCalledTimes(1));

		// Submit a buy trade — hangs on our mock
		const confirmButton = await submitBuyTrade(user, 5);

		// Assert disabled while pending
		await waitFor(() => {
			expect(confirmButton).toBeDisabled();
		});

		// Reject the transaction
		expect(mutationReject).not.toBeNull();
		mutationReject!(new Error('Transaction rejected by network'));

		// The dialog should stay open on failure (close is in the try block),
		// and the confirm button should be re-enabled.
		await waitFor(
			() => {
				expect(confirmButton).not.toBeDisabled();
			},
			{ timeout: 3000 }
		);

		// The dialog should still be open so the user can retry
		expect(screen.getByRole('dialog')).toBeInTheDocument();
	});

	it('prevents duplicate submission while the button is disabled', async () => {
		const user = userEvent.setup();
		mockGetCourses.mockResolvedValue(singleCreator);

		render(
			<MemoryRouter>
				<LandingPage />
			</MemoryRouter>
		);

		await waitFor(() => expect(mockGetCourses).toHaveBeenCalledTimes(1));

		// Submit a buy trade — hangs on our mock
		const confirmButton = await submitBuyTrade(user, 5);

		// Assert disabled while pending
		await waitFor(() => {
			expect(confirmButton).toBeDisabled();
		});

		// Attempting to click the disabled confirm button via userEvent should
		// be silently rejected (userEvent respects the disabled attribute).
		// We verify the dialog stays open afterward — no duplicate submission.
		await user.click(confirmButton);

		// Dialog should still be open (no duplicate submission triggered)
		expect(screen.getByRole('dialog')).toBeInTheDocument();

		// Now resolve the original transaction
		expect(mutationResolve).not.toBeNull();
		mutationResolve!({ success: true });

		// Dialog should close exactly once after the single submission resolves
		await waitFor(
			() => {
				expect(screen.queryByRole('dialog')).toBeNull();
			},
			{ timeout: 3000 }
		);
	});
});
