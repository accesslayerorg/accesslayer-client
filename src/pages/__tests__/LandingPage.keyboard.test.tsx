import type { ComponentProps, ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LandingPage from '@/pages/LandingPage';
import { courseService, type Course } from '@/services/course.service';

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

vi.mock('@/components/common/StellarConnectionQualityBadge', async () => {
	const React = await import('react');

	return {
		default: () =>
			React.createElement('div', { role: 'status' }, 'RPC good'),
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
	render(<LandingPage />);
	await waitFor(() => expect(mockGetCourses).toHaveBeenCalledTimes(1));
};

describe('LandingPage creator refresh shortcut', () => {
	beforeEach(() => {
		mockMatchMedia();
		window.localStorage.clear();
		window.sessionStorage.clear();
		mockGetCourses.mockReset();
		mockGetCourses.mockResolvedValue(creatorList);
	});

	it('refreshes creator list data with Ctrl/Cmd + Alt + R', async () => {
		await renderLandingPage();

		const shortcutEvent = new KeyboardEvent('keydown', {
			key: 'r',
			code: 'KeyR',
			ctrlKey: true,
			altKey: true,
			bubbles: true,
			cancelable: true,
		});

		fireEvent(window, shortcutEvent);

		expect(shortcutEvent.defaultPrevented).toBe(true);
		expect(
			screen.getByLabelText('Ctrl/Cmd + Alt + R refreshes creator list data')
		).toBeInTheDocument();
		expect(
			await screen.findByText('Creator list refresh requested')
		).toBeInTheDocument();
		await waitFor(() => expect(mockGetCourses).toHaveBeenCalledTimes(2));
	});

	it('does not trigger while focus is inside text inputs or textareas', async () => {
		await renderLandingPage();

		const input = document.createElement('input');
		const textarea = document.createElement('textarea');
		document.body.append(input, textarea);

		fireEvent.keyDown(input, {
			key: 'r',
			code: 'KeyR',
			ctrlKey: true,
			altKey: true,
			bubbles: true,
		});
		fireEvent.keyDown(textarea, {
			key: 'r',
			code: 'KeyR',
			ctrlKey: true,
			altKey: true,
			bubbles: true,
		});

		await new Promise(resolve => window.setTimeout(resolve, 0));

		expect(mockGetCourses).toHaveBeenCalledTimes(1);
		expect(
			screen.queryByText('Creator list refresh requested')
		).not.toBeInTheDocument();

		input.remove();
		textarea.remove();
	});
});
