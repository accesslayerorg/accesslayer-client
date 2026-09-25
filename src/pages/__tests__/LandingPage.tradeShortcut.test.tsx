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

const renderLandingPage = async () => {
	render(
		<MemoryRouter>
			<LandingPage />
		</MemoryRouter>
	);
	await waitFor(() => expect(mockGetCourses).toHaveBeenCalledTimes(1));
};

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

describe('LandingPage trade shortcut — form element suppression', () => {
	beforeEach(() => {
		mockMatchMedia();
		window.localStorage.clear();
		window.sessionStorage.clear();
		mockGetCourses.mockReset();
		mockGetCourses.mockResolvedValue(creatorList);
	});

	it('opens the trade dialog when focus is on the document body', async () => {
		await renderLandingPage();

		const event = pressT();

		expect(event.defaultPrevented).toBe(true);
		expect(await screen.findByRole('dialog')).toBeInTheDocument();
	});

	it('does not open the trade dialog when focus is on an input element', async () => {
		await renderLandingPage();

		const input = document.createElement('input');
		document.body.appendChild(input);

		fireEvent.keyDown(input, {
			key: 't',
			code: 'KeyT',
			bubbles: true,
			cancelable: true,
		});

		await new Promise(resolve => window.setTimeout(resolve, 0));

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

		input.remove();
	});

	it('does not open the trade dialog when focus is on a textarea element', async () => {
		await renderLandingPage();

		const textarea = document.createElement('textarea');
		document.body.appendChild(textarea);

		fireEvent.keyDown(textarea, {
			key: 't',
			code: 'KeyT',
			bubbles: true,
			cancelable: true,
		});

		await new Promise(resolve => window.setTimeout(resolve, 0));

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

		textarea.remove();
	});

	it('does not open the trade dialog when focus is on a select element', async () => {
		await renderLandingPage();

		const select = document.createElement('select');
		document.body.appendChild(select);

		fireEvent.keyDown(select, {
			key: 't',
			code: 'KeyT',
			bubbles: true,
			cancelable: true,
		});

		await new Promise(resolve => window.setTimeout(resolve, 0));

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

		select.remove();
	});
});
