import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MyTicketsSection from '@/components/settings/MyTicketsSection';
import { supportTicketService } from '@/services/supportTicket.service';

vi.mock('@/services/supportTicket.service', async () => {
	const actual = await vi.importActual<
		typeof import('@/services/supportTicket.service')
	>('@/services/supportTicket.service');
	return {
		...actual,
		supportTicketService: {
			submitTicket: vi.fn(),
			getMyTickets: vi.fn(),
		},
	};
});

function makeWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	return ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}

describe('MyTicketsSection (#1250)', () => {
	beforeEach(() => {
		vi.mocked(supportTicketService.getMyTickets).mockReset();
	});

	it('shows an empty state when there are no tickets', async () => {
		vi.mocked(supportTicketService.getMyTickets).mockResolvedValue([]);
		render(<MyTicketsSection />, { wrapper: makeWrapper() });

		await waitFor(() =>
			expect(screen.getByTestId('my-tickets-empty')).toBeInTheDocument()
		);
	});

	it('shows an error state when the request fails', async () => {
		vi.mocked(supportTicketService.getMyTickets).mockRejectedValue(
			new Error('network error')
		);
		render(<MyTicketsSection />, { wrapper: makeWrapper() });

		await waitFor(() =>
			expect(screen.getByTestId('my-tickets-error')).toBeInTheDocument()
		);
	});

	it('lists tickets with their issue type and status', async () => {
		vi.mocked(supportTicketService.getMyTickets).mockResolvedValue([
			{
				id: 'ticket-1',
				keyId: 'key-1',
				keyName: 'Luna Starlight',
				issueType: 'trading_frozen',
				description: 'Cannot sell my keys',
				status: 'in_review',
				createdAt: new Date().toISOString(),
			},
		]);
		render(<MyTicketsSection />, { wrapper: makeWrapper() });

		await waitFor(() =>
			expect(screen.getByTestId('ticket-row-ticket-1')).toBeInTheDocument()
		);
		expect(screen.getByText(/Trading Frozen/)).toBeInTheDocument();
		expect(screen.getByTestId('ticket-status-ticket-1')).toHaveTextContent(
			'In review'
		);
	});
});
