import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import LandingPage from '@/pages/LandingPage';
import { courseService } from '@/services/course.service';
import type { Course } from '@/services/course.service';

// Mock the course service
vi.mock('@/services/course.service', () => ({
	courseService: {
		getCourses: vi.fn(),
	},
}));

// Mock framer-motion to avoid animation complexity in tests
vi.mock('framer-motion', () => ({
	motion: {
		div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
		button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
			<button {...props}>{children}</button>
		),
	},
	AnimatePresence: ({ children }: React.PropsWithChildren) => children,
}));

// Mock GSAP to avoid animation errors
vi.mock('gsap', () => ({
	default: {
		timeline: vi.fn(() => ({
			to: vi.fn().mockReturnThis(),
			from: vi.fn().mockReturnThis(),
			fromTo: vi.fn().mockReturnThis(),
		})),
		to: vi.fn(),
		from: vi.fn(),
		fromTo: vi.fn(),
	},
}));

const createMockCourse = (
	id: string,
	priceStroops: number | null,
	price?: number | null
): Course => ({
	id,
	title: `Creator ${id}`,
	description: `Description for ${id}`,
	price: price ?? 0,
	priceStroops: priceStroops ?? undefined,
	instructorId: id,
	category: 'Technology',
	level: 'BEGINNER',
	isVerified: true,
});

describe('LandingPage - Portfolio Total XLM Value', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('correctly sums total XLM value for a portfolio with two positions', async () => {
		// Position 0: 3 keys (featuredHoldings) @ 500,000 stroops = 1,500,000 stroops (0.15 XLM)
		// Position 1: 2 keys (DEMO_HELD_KEY_QUANTITIES[1]) @ 1,200,000 stroops = 2,400,000 stroops (0.24 XLM)
		// Total: 3,900,000 stroops = 0.39 XLM
		const mockCourses: Course[] = [
			createMockCourse('creator1', 500_000),
			createMockCourse('creator2', 1_200_000),
		];

		vi.mocked(courseService.getCourses).mockResolvedValue(mockCourses);

		render(
			<MemoryRouter>
				<LandingPage />
			</MemoryRouter>
		);

		// Wait for the portfolio value to be calculated and displayed
		await waitFor(
			() => {
				const portfolioDisplay = screen.getByText(/XLM/);
				expect(portfolioDisplay).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);

		// The first position gets featuredHoldings (3), second gets DEMO_HELD_KEY_QUANTITIES[1] (2)
		// Expected: (3 * 500,000) + (2 * 1,200,000) = 3,900,000 stroops = 0.39 XLM
		const portfolioValue = screen.getByText(/0\.39 XLM/i);
		expect(portfolioValue).toBeInTheDocument();

		// Verify helper text shows 2 positions
		expect(screen.getByText(/across 2 held creator positions/i)).toBeInTheDocument();
	});

	it('excludes positions with zero quantity from the total', async () => {
		// Position 0: 3 keys (featuredHoldings) @ 500,000 stroops = 1,500,000 stroops (0.15 XLM)
		// Position 1: 2 keys @ 1,200,000 stroops = 2,400,000 stroops (0.24 XLM)
		// Position 2: 1 key @ 800_000 stroops = 800,000 stroops (0.08 XLM)
		// Position 3: 0 keys (DEMO_HELD_KEY_QUANTITIES[3] = undefined = 0) @ 900,000 = 0 (excluded)
		// Total: 4,700,000 stroops = 0.47 XLM
		const mockCourses: Course[] = [
			createMockCourse('creator1', 500_000),
			createMockCourse('creator2', 1_200_000),
			createMockCourse('creator3', 800_000),
			createMockCourse('creator4', 900_000), // This will have 0 quantity (index 3, no entry in array)
		];

		vi.mocked(courseService.getCourses).mockResolvedValue(mockCourses);

		render(
			<MemoryRouter>
				<LandingPage />
			</MemoryRouter>
		);

		await waitFor(
			() => {
				const portfolioDisplay = screen.getByText(/XLM/);
				expect(portfolioDisplay).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);

		// DEMO_HELD_KEY_QUANTITIES = [0, 2, 1], so index 0 gets featuredHoldings (3)
		// Total should be: 3*500,000 + 2*1,200,000 + 1*800,000 = 4,700,000 stroops = 0.47 XLM
		const portfolioValue = screen.getByText(/0\.47 XLM/i);
		expect(portfolioValue).toBeInTheDocument();

		// Verify helper text shows 3 held positions (4th is excluded)
		expect(screen.getByText(/across 3 held creator positions/i)).toBeInTheDocument();
	});

	it('displays 0 XLM when all positions have price of 0', async () => {
		// All positions have 0 price
		const mockCourses: Course[] = [
			createMockCourse('creator1', 0),
			createMockCourse('creator2', 0),
		];

		vi.mocked(courseService.getCourses).mockResolvedValue(mockCourses);

		render(
			<MemoryRouter>
				<LandingPage />
			</MemoryRouter>
		);

		await waitFor(
			() => {
				const portfolioDisplay = screen.getByText(/0 XLM/i);
				expect(portfolioDisplay).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);

		// Should show the positions are held but value is 0
		expect(screen.getByText(/across \d+ held creator position/i)).toBeInTheDocument();
	});

	it('updates total reactively when a position price changes', async () => {
		// Initial: Position 0 @ 500,000 stroops (3 keys), Position 1 @ 1,000,000 stroops (2 keys)
		// Initial total: (3 * 500,000) + (2 * 1,000,000) = 3,500,000 stroops = 0.35 XLM
		const initialCourses: Course[] = [
			createMockCourse('creator1', 500_000),
			createMockCourse('creator2', 1_000_000),
		];

		vi.mocked(courseService.getCourses).mockResolvedValue(initialCourses);

		const { rerender } = render(
			<MemoryRouter>
				<LandingPage />
			</MemoryRouter>
		);

		// Wait for initial render
		await waitFor(
			() => {
				expect(screen.getByText(/0\.35 XLM/i)).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);

		// Update the mock to return new prices
		const updatedCourses: Course[] = [
			createMockCourse('creator1', 500_000), // Same
			createMockCourse('creator2', 2_000_000), // Price doubled
		];

		vi.mocked(courseService.getCourses).mockResolvedValue(updatedCourses);

		// Force a re-render by remounting
		rerender(
			<MemoryRouter>
				<LandingPage />
			</MemoryRouter>
		);

		// The component should recalculate with new prices
		// New total: (3 * 500,000) + (2 * 2,000,000) = 5,500,000 stroops = 0.55 XLM
		await waitFor(
			() => {
				const updatedValue = screen.queryByText(/0\.55 XLM/i);
				// Note: Since we're remounting the entire component, it will refetch
				expect(updatedValue).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);
	});

	it('formats the total to proper decimal places in the UI', async () => {
		// Create a scenario that results in more than 2 decimal places
		// 3 keys @ 333,333 stroops = 999,999 stroops = 0.0999999 XLM
		// Should display as 0.1 XLM (formatted per formatDisplayKeyPrice logic)
		const mockCourses: Course[] = [createMockCourse('creator1', 333_333)];

		vi.mocked(courseService.getCourses).mockResolvedValue(mockCourses);

		render(
			<MemoryRouter>
				<LandingPage />
			</MemoryRouter>
		);

		await waitFor(
			() => {
				const portfolioDisplay = screen.getByText(/XLM/);
				expect(portfolioDisplay).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);

		// The formatDisplayKeyPrice function formats to at most 4 decimal places
		// but typically rounds sensibly. Check that XLM is present and formatted.
		const xlmText = screen.getByText(/[\d,]+(?:\.\d{1,4})?\s*XLM/);
		expect(xlmText).toBeInTheDocument();

		// Extract the numeric part to verify it's properly formatted
		const textContent = xlmText.textContent || '';
		const match = textContent.match(/([\d,.]+)\s*XLM/);
		expect(match).toBeTruthy();

		if (match) {
			const numericValue = match[1].replace(/,/g, '');
			const decimalPlaces = numericValue.includes('.')
				? numericValue.split('.')[1].length
				: 0;
			// Should be formatted with 4 or fewer decimal places (per formatDisplayKeyPrice)
			expect(decimalPlaces).toBeLessThanOrEqual(4);
		}
	});

	it('displays loading state while prices are being fetched', async () => {
		// Delay the resolution to simulate loading
		const mockCourses: Course[] = [
			createMockCourse('creator1', 500_000),
			createMockCourse('creator2', 1_000_000),
		];

		vi.mocked(courseService.getCourses).mockImplementation(
			() =>
				new Promise(resolve => {
					setTimeout(() => resolve(mockCourses), 100);
				})
		);

		render(
			<MemoryRouter>
				<LandingPage />
			</MemoryRouter>
		);

		// Should show loading state initially
		expect(screen.getByText(/loading prices/i)).toBeInTheDocument();

		// Wait for the data to load
		await waitFor(
			() => {
				expect(screen.getByText(/XLM/)).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);

		// Loading text should be gone
		expect(screen.queryByText(/loading prices/i)).not.toBeInTheDocument();
	});

	it('handles empty portfolio (no holdings) correctly', async () => {
		// Return creators but the demo quantities will all be 0
		const mockCourses: Course[] = [];

		vi.mocked(courseService.getCourses).mockResolvedValue(mockCourses);

		render(
			<MemoryRouter>
				<LandingPage />
			</MemoryRouter>
		);

		await waitFor(
			() => {
				// Should show 0 XLM for empty portfolio
				expect(screen.getByText(/0 XLM/i)).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);

		// Should show helper text for no holdings
		expect(screen.getByText(/no held creator keys yet/i)).toBeInTheDocument();
	});

	it('displays unavailable state when position is missing price data', async () => {
		// Position 0: 3 keys with valid price
		// Position 1: 2 keys (DEMO_HELD_KEY_QUANTITIES[1]) with null price - should cause unavailable
		const mockCourses: Course[] = [
			createMockCourse('creator1', 500_000),
			createMockCourse('creator2', null, null), // Missing price, but has quantity = 2
		];

		vi.mocked(courseService.getCourses).mockResolvedValue(mockCourses);

		render(
			<MemoryRouter>
				<LandingPage />
			</MemoryRouter>
		);

		await waitFor(
			() => {
				// When any held position is missing price, should show "Unavailable"
				// Position 1 has quantity 2 (from DEMO_HELD_KEY_QUANTITIES[1]) and null price
				// So the status should be "unavailable"
				expect(screen.getByText(/unavailable/i)).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);

		// Should show helper text about missing price data
		expect(
			screen.getByText(/missing current price data/i)
		).toBeInTheDocument();
	});

	it('correctly sums when using legacy price field instead of priceStroops', async () => {
		// Test backward compatibility with legacy price field
		// Position 0: 3 keys (featuredHoldings) @ 1.5 XLM (legacy) = 3 * 15,000,000 stroops = 45,000,000 stroops = 4.5 XLM
		const mockCourses: Course[] = [
			createMockCourse('creator1', null, 1.5), // Legacy price: 1.5 XLM
		];

		vi.mocked(courseService.getCourses).mockResolvedValue(mockCourses);

		render(
			<MemoryRouter>
				<LandingPage />
			</MemoryRouter>
		);

		await waitFor(
			() => {
				// Expected: 3 * (1.5 * 10,000,000) = 45,000,000 stroops = 4.5 XLM
				const portfolioDisplay = screen.getByText(/4\.5 XLM/i);
				expect(portfolioDisplay).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);
	});
});
