import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RetirementBuybackConfirmedPage from '@/pages/RetirementBuybackConfirmedPage';
import { courseService } from '@/services/course.service';

vi.mock('@/services/course.service', () => ({
	courseService: {
		getCourse: vi.fn(),
	},
}));

const mockGetCourse = vi.mocked(courseService.getCourse);

function renderPage(state: unknown) {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});

	return render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter
				initialEntries={[
					{
						pathname: '/keys/retired-key/retirement/confirmed',
						state,
					},
				]}
			>
				<Routes>
					<Route
						path="/keys/:id/retirement/confirmed"
						element={<RetirementBuybackConfirmedPage />}
					/>
				</Routes>
			</MemoryRouter>
		</QueryClientProvider>
	);
}

describe('RetirementBuybackConfirmedPage', () => {
	beforeEach(() => {
		mockGetCourse.mockReset();
		mockGetCourse.mockResolvedValue({
			id: 'retired-key',
			title: 'Retired Key',
			description: 'A retired key',
			price: 0.25,
			instructorId: 'creator',
			category: 'Art',
			level: 'BEGINNER',
		});
	});

	it('shows the received amount from the holder execution receipt', async () => {
		renderPage({
			holderPayoutStroops: 15_000_000,
			executedAt: '2026-11-20T12:00:00Z',
			transactionHash: 'tx-123',
		});

		expect(
			await screen.findByTestId('retirement-buyback-confirmed')
		).toBeInTheDocument();
		expect(screen.getByTestId('retirement-holder-payout')).toHaveTextContent(
			'1.50 XLM'
		);
		expect(screen.getByText('tx-123')).toBeInTheDocument();
	});

	it('does not present an unvalidated or absent receipt as confirmed', async () => {
		renderPage({
			holderPayoutStroops: Number.NaN,
			executedAt: '2026-11-20T12:00:00Z',
		});

		expect(
			await screen.findByTestId('retirement-buyback-pending')
		).toBeInTheDocument();
		expect(
			screen.queryByTestId('retirement-buyback-confirmed')
		).not.toBeInTheDocument();
	});
});
