import type { ComponentProps, ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LandingPage from '@/pages/LandingPage';
import { courseService, type Course } from '@/services/course.service';

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
	id: '1',
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

describe('LandingPage price filters integration (#493)', () => {
	beforeEach(() => {
		mockMatchMedia();
		window.localStorage.clear();
		window.sessionStorage.clear();
		mockGetCourses.mockReset();
	});

	it('clears min and max price inputs and re-fetches creators without price params', async () => {
		mockGetCourses.mockResolvedValue([creator]);
		render(
			<MemoryRouter>
				<LandingPage />
			</MemoryRouter>
		);
		await waitFor(() => expect(mockGetCourses).toHaveBeenCalledTimes(1));

		const minPriceInput = screen.getByLabelText(/min price/i);
		const maxPriceInput = screen.getByLabelText(/max price/i);

		fireEvent.change(minPriceInput, { target: { value: '1.5' } });
		fireEvent.change(maxPriceInput, { target: { value: '4.25' } });

		await waitFor(() =>
			expect(mockGetCourses).toHaveBeenLastCalledWith({
				min_price: 1.5,
				max_price: 4.25,
			})
		);

		fireEvent.click(screen.getByRole('button', { name: /^clear$/i }));

		await waitFor(() => {
			expect(minPriceInput).toHaveValue(null);
			expect(maxPriceInput).toHaveValue(null);
			expect(mockGetCourses).toHaveBeenLastCalledWith(undefined);
		});
	});
});
