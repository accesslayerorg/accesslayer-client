import { vi } from 'vitest';

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

vi.mock('@/components/common/StellarConnectionQualityBadge', () => {
	return {
		default: () => null,
	};
});

vi.mock('@/components/common/FeaturedCreatorAudienceChip', () => {
	return {
		FeaturedCreatorAudienceChip: () => null,
	};
});

vi.mock('@/components/common/CreatorCard', () => {
	return {
		default: () => null,
	};
});

vi.mock('framer-motion', () => {
	return {
		AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
		LayoutGroup: ({ children }: { children: React.ReactNode }) => children,
		motion: {
			div: ({ children }: { children: React.ReactNode }) => children,
			h1: ({ children }: { children: React.ReactNode }) => children,
			button: ({ children }: { children: React.ReactNode }) => children,
		},
	};
});

import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import LandingPage from '@/pages/LandingPage';
import {
	courseService,
	type Course,
} from '@/services/course.service';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockGetCourses = vi.mocked(courseService.getCourses);

const creatorAlpha: Course = {
	id: '1',
	title: 'Creator Alpha',
	description: 'Digital artist',
	price: 0.5,
	priceStroops: 5_000_000,
	creatorShareSupply: 100,
	instructorId: 'creator-alpha',
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

describe('LandingPage search debounce logic', () => {
	let queryClient: QueryClient;
	let consoleDebugSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		vi.useFakeTimers();
		mockMatchMedia();
		window.localStorage.clear();
		window.sessionStorage.clear();
		mockGetCourses.mockReset();
		mockGetCourses.mockResolvedValue([creatorAlpha]);
		consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
		queryClient = new QueryClient({
			defaultOptions: {
				queries: {
					retry: false,
				},
			},
		});
	});

	afterEach(() => {
		vi.useRealTimers();
		consoleDebugSpy.mockRestore();
	});

	it('does not immediately call the query on keystroke, and calls it once after 300ms with correct value', async () => {
		render(
			<QueryClientProvider client={queryClient}>
				<MemoryRouter>
					<LandingPage />
				</MemoryRouter>
			</QueryClientProvider>
		);

		// Resolve initial load fetch
		await act(async () => {
			await vi.advanceTimersByTimeAsync(300);
		});
		expect(mockGetCourses).toHaveBeenCalledTimes(1);
		mockGetCourses.mockClear();

		const input = screen.getByPlaceholderText(/search creators by name or handle/i);

		// Type a character
		act(() => {
			fireEvent.change(input, { target: { value: 'a' } });
		});

		// Check that the query is NOT called immediately
		expect(mockGetCourses).not.toHaveBeenCalled();

		// Advance timers by 300ms
		await act(async () => {
			await vi.advanceTimersByTimeAsync(300);
		});

		// Should call the query once with the typed value
		expect(mockGetCourses).toHaveBeenCalledTimes(1);
		expect(mockGetCourses).toHaveBeenCalledWith({ search: 'a' });
	});

	it('typing three characters in quick succession triggers only one query (the last value)', async () => {
		render(
			<QueryClientProvider client={queryClient}>
				<MemoryRouter>
					<LandingPage />
				</MemoryRouter>
			</QueryClientProvider>
		);

		// Resolve initial load fetch
		await act(async () => {
			await vi.advanceTimersByTimeAsync(300);
		});
		mockGetCourses.mockClear();

		const input = screen.getByPlaceholderText(/search creators by name or handle/i);

		// Type three characters with 50ms gaps in between (well under 300ms)
		act(() => {
			fireEvent.change(input, { target: { value: 'a' } });
		});
		await act(async () => {
			await vi.advanceTimersByTimeAsync(50);
		});
		act(() => {
			fireEvent.change(input, { target: { value: 'ab' } });
		});
		await act(async () => {
			await vi.advanceTimersByTimeAsync(50);
		});
		act(() => {
			fireEvent.change(input, { target: { value: 'abc' } });
		});

		// Query not called yet because the timer got reset
		expect(mockGetCourses).not.toHaveBeenCalled();

		// Wait 300ms for final settle
		await act(async () => {
			await vi.advanceTimersByTimeAsync(300);
		});

		// Should have been called exactly once with the last value
		expect(mockGetCourses).toHaveBeenCalledTimes(1);
		expect(mockGetCourses).toHaveBeenCalledWith({ search: 'abc' });
	});

	it('clearing the input after 300ms triggers a query with an empty string (passes undefined parameter)', async () => {
		render(
			<QueryClientProvider client={queryClient}>
				<MemoryRouter initialEntries={['/?q=test']}>
					<LandingPage />
				</MemoryRouter>
			</QueryClientProvider>
		);

		// Resolve initial load fetches
		await act(async () => {
			await vi.advanceTimersByTimeAsync(300);
		});
		mockGetCourses.mockClear();

		const input = screen.getByPlaceholderText(/search creators by name or handle/i);
		expect(input).toHaveValue('test');

		// Clear input
		act(() => {
			fireEvent.change(input, { target: { value: '' } });
		});

		// Not called immediately
		expect(mockGetCourses).not.toHaveBeenCalled();

		// Settle clearing by advancing timers by 300ms
		await act(async () => {
			await vi.advanceTimersByTimeAsync(300);
		});

		// Called once without the search parameter (undefined param mapping to empty string)
		expect(mockGetCourses).toHaveBeenCalledTimes(1);
		expect(mockGetCourses).toHaveBeenLastCalledWith(undefined);
	});
});
