import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SupportTicketDialog from '@/components/common/SupportTicketDialog';
import { supportTicketService } from '@/services/supportTicket.service';

vi.mock('@/utils/toast.util', () => ({
	default: { success: vi.fn(), error: vi.fn() },
}));

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

describe('SupportTicketDialog (#1250)', () => {
	beforeEach(() => {
		vi.mocked(supportTicketService.submitTicket).mockReset();
	});

	it('shows a validation error when submitting without an issue type', () => {
		render(
			<SupportTicketDialog
				open={true}
				onOpenChange={vi.fn()}
				keyId="key-1"
				keyName="Luna Starlight"
			/>,
			{ wrapper: makeWrapper() }
		);

		fireEvent.click(screen.getByTestId('support-ticket-submit'));
		expect(screen.getByTestId('support-ticket-error')).toHaveTextContent(
			'Choose an issue type.'
		);
		expect(supportTicketService.submitTicket).not.toHaveBeenCalled();
	});

	it('submits the ticket and closes the dialog on success', async () => {
		vi.mocked(supportTicketService.submitTicket).mockResolvedValue({
			id: 'ticket-1',
			keyId: 'key-1',
			issueType: 'trading_frozen',
			description: 'Cannot sell my keys',
			status: 'open',
			createdAt: new Date().toISOString(),
		});
		const onOpenChange = vi.fn();

		render(
			<SupportTicketDialog
				open={true}
				onOpenChange={onOpenChange}
				keyId="key-1"
				keyName="Luna Starlight"
			/>,
			{ wrapper: makeWrapper() }
		);

		fireEvent.change(screen.getByTestId('support-ticket-issue-type-select'), {
			target: { value: 'trading_frozen' },
		});
		fireEvent.change(screen.getByTestId('support-ticket-description-input'), {
			target: { value: 'Cannot sell my keys' },
		});
		fireEvent.click(screen.getByTestId('support-ticket-submit'));

		await waitFor(() => {
			expect(supportTicketService.submitTicket).toHaveBeenCalledWith({
				keyId: 'key-1',
				issueType: 'trading_frozen',
				description: 'Cannot sell my keys',
				transactionHash: undefined,
			});
		});
		await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
	});

	it('rejects a malformed transaction hash before submitting', () => {
		render(
			<SupportTicketDialog
				open={true}
				onOpenChange={vi.fn()}
				keyId="key-1"
			/>,
			{ wrapper: makeWrapper() }
		);

		fireEvent.change(screen.getByTestId('support-ticket-issue-type-select'), {
			target: { value: 'other' },
		});
		fireEvent.change(screen.getByTestId('support-ticket-description-input'), {
			target: { value: 'something is off' },
		});
		fireEvent.change(screen.getByTestId('support-ticket-tx-hash-input'), {
			target: { value: 'not-a-hash' },
		});
		fireEvent.click(screen.getByTestId('support-ticket-submit'));

		expect(screen.getByTestId('support-ticket-error')).toHaveTextContent(
			'Transaction hash must be 64 hex characters.'
		);
		expect(supportTicketService.submitTicket).not.toHaveBeenCalled();
	});

	it('calls onOpenChange(false) when cancel is clicked', () => {
		const onOpenChange = vi.fn();
		render(
			<SupportTicketDialog open={true} onOpenChange={onOpenChange} keyId="key-1" />,
			{ wrapper: makeWrapper() }
		);

		fireEvent.click(screen.getByTestId('support-ticket-cancel'));
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});
});
