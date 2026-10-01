import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router';
import CreatorDetailPage from '@/pages/CreatorDetailPage';
import { courseService } from '@/services/course.service';

vi.mock('@/services/course.service', () => ({
	courseService: {
		getCourse: vi.fn(),
		getHoldersPage: vi.fn(),
	},
}));

vi.mock('framer-motion', () => ({
	AnimatePresence: ({ children }: React.PropsWithChildren) => children,
	LayoutGroup: ({ children }: React.PropsWithChildren) => children,
	motion: {
		div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
			<div {...props}>{children}</div>
		),
		h1: ({
			children,
			...props
		}: React.HTMLAttributes<HTMLHeadingElement>) => (
			<h1 {...props}>{children}</h1>
		),
		button: ({
			children,
			...props
		}: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
			<button {...props}>{children}</button>
		),
	},
}));

const mockGetCourse = vi.mocked(courseService.getCourse);
const mockGetHoldersPage = vi.mocked(courseService.getHoldersPage);

function createQueryClient() {
	return new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
}

describe('CreatorDetailPage — Deprecation & Buy Button', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		mockGetHoldersPage.mockResolvedValue({
			holders: [],
			nextPage: null,
			totalCount: 0,
		});
	});

	it('disables the Buy button on the key detail page after deprecation', async () => {
		mockGetCourse.mockResolvedValueOnce({
			id: 'creator-deprecated',
			title: 'Deprecated Creator',
			description: 'Test description',
			category: 'Tech',
			level: 'BEGINNER',
			price: 1,
			priceStroops: 10_000_000,
			creatorShareSupply: 100,
			deprecated: true,
			deprecationReason: 'Creator left platform',
		});

		const queryClient = createQueryClient();
		render(
			<QueryClientProvider client={queryClient}>
				<MemoryRouter initialEntries={['/creators/creator-deprecated']}>
					<Routes>
						<Route path="/creators/:id" element={<CreatorDetailPage />} />
					</Routes>
				</MemoryRouter>
			</QueryClientProvider>
		);

		await waitFor(() => {
			expect(
				screen.getByTestId('key-detail-buy-button')
			).toBeInTheDocument();
		});

		const buyButton = screen.getByTestId('key-detail-buy-button');
		expect(buyButton).toBeDisabled();
		expect(buyButton).toHaveTextContent('Buy Disabled (Deprecated)');
		expect(screen.getByTestId('deprecation-notice')).toBeInTheDocument();
	});
});
