/**
 * Integration test for the `T` trade-shortcut keyboard listener being torn
 * down when the creator profile page (LandingPage — see the "Issue 554: T
 * key opens the trade panel from the creator profile page" comment on its
 * keydown effect) unmounts (#654).
 *
 * The `useEffect` registering the listener already returns a cleanup
 * function that calls `window.removeEventListener`, so this test is meant
 * to confirm that wiring actually works end-to-end:
 *   - `T` opens the trade dialog while the page is mounted
 *   - Unmounting the page (simulating navigating away, e.g. to a creator
 *     discovery list elsewhere in the app) removes the listener, so `T`
 *     does nothing afterwards and produces no console errors
 *   - Mounting the page again re-registers the listener, so `T` opens the
 *     trade dialog again
 */
import type { ComponentProps, ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
			button: ({ children, ...props }: ComponentProps<'button'>) =>
				React.createElement('button', props, children),
		},
	};
});

const mockGetCourses = vi.mocked(courseService.getCourses);

const creatorList: Course[] = [
	{
		id: 'alex-rivers',
		title: 'Alex Rivers',
		description: 'Digital artist',
		price: 0.05,
		priceStroops: 500_000,
		creatorShareSupply: 120,
		instructorId: 'arivers',
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

/** A stand-in for "the creator discovery list page" the user navigates to. */
function DiscoveryListPlaceholder() {
	return <div data-testid="discovery-list-placeholder">Creator discovery list</div>;
}

function pressT() {
	const event = new KeyboardEvent('keydown', {
		key: 't',
		code: 'KeyT',
		bubbles: true,
		cancelable: true,
	});
	fireEvent(window, event);
	return event;
}

describe('LandingPage trade shortcut — cleanup on unmount (#654)', () => {
	beforeEach(() => {
		mockMatchMedia();
		window.localStorage.clear();
		window.sessionStorage.clear();
		mockGetCourses.mockReset();
		mockGetCourses.mockResolvedValue(creatorList);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('opens the trade dialog with T, stops responding after unmount, and works again after remount', async () => {
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		// 1. Mount the creator profile page and confirm T opens the trade dialog.
		const { unmount } = render(
			<MemoryRouter>
				<LandingPage />
			</MemoryRouter>
		);
		await waitFor(() => expect(mockGetCourses).toHaveBeenCalledTimes(1));

		const firstPress = pressT();
		expect(firstPress.defaultPrevented).toBe(true);
		expect(await screen.findByRole('dialog')).toBeInTheDocument();

		// 2. Navigate away: unmount the profile page and mount a stand-in for
		//    the creator discovery list page in its place.
		unmount();
		const { unmount: unmountDiscoveryList } = render(<DiscoveryListPlaceholder />);
		expect(screen.getByTestId('discovery-list-placeholder')).toBeInTheDocument();

		// 3. T should now do nothing -- no dialog, no preventDefault -- because
		//    the listener registered by the unmounted page was cleaned up.
		const secondPress = pressT();
		expect(secondPress.defaultPrevented).toBe(false);
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		expect(consoleErrorSpy).not.toHaveBeenCalled();

		// 4. Navigate back: unmount the discovery list stand-in and mount the
		//    profile page again -- this re-registers the listener, so T opens
		//    the trade dialog once more.
		unmountDiscoveryList();
		render(
			<MemoryRouter>
				<LandingPage />
			</MemoryRouter>
		);
		await waitFor(() => expect(mockGetCourses).toHaveBeenCalledTimes(2));

		const thirdPress = pressT();
		expect(thirdPress.defaultPrevented).toBe(true);
		expect(await screen.findByRole('dialog')).toBeInTheDocument();

		expect(consoleErrorSpy).not.toHaveBeenCalled();
	});
});
