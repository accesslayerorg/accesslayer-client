import { BaseApiService, type APIResponse } from './api.service';

/** Issue types a holder can report against a specific key (#1250). */
export const SUPPORT_TICKET_ISSUE_TYPES = [
	'trading_frozen',
	'balance_dispute',
	'incorrect_fee',
	'other',
] as const;

export type SupportTicketIssueType =
	(typeof SUPPORT_TICKET_ISSUE_TYPES)[number];

export const SUPPORT_TICKET_ISSUE_TYPE_LABELS: Record<
	SupportTicketIssueType,
	string
> = {
	trading_frozen: 'Trading Frozen',
	balance_dispute: 'Balance Dispute',
	incorrect_fee: 'Incorrect Fee',
	other: 'Other',
};

export const SUPPORT_TICKET_STATUSES = [
	'open',
	'in_review',
	'resolved',
	'closed',
] as const;

export type SupportTicketStatus = (typeof SUPPORT_TICKET_STATUSES)[number];

export interface SupportTicketDraft {
	keyId: string;
	issueType: SupportTicketIssueType;
	description: string;
	/** Optional on-chain transaction hash the ticket is about. */
	transactionHash?: string;
}

export interface SupportTicket {
	id: string;
	keyId: string;
	keyName?: string;
	issueType: SupportTicketIssueType;
	description: string;
	transactionHash?: string | null;
	status: SupportTicketStatus;
	createdAt: string;
}

class SupportTicketService extends BaseApiService {
	/**
	 * Submits a support ticket reporting an issue with a specific key
	 * (#1250): frozen trading, a disputed transaction, an incorrect balance,
	 * or an unlisted issue. Routed to admin review.
	 * POST /support/tickets
	 */
	async submitTicket(draft: SupportTicketDraft): Promise<SupportTicket> {
		try {
			const response = await this.api.post<APIResponse<SupportTicket>>(
				'/support/tickets',
				draft
			);
			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Tickets the authenticated user has submitted, newest first, shown in
	 * the "My Tickets" section of user settings (#1250).
	 * GET /support/tickets
	 */
	async getMyTickets(): Promise<SupportTicket[]> {
		try {
			const response = await this.api.get<APIResponse<SupportTicket[]>>(
				'/support/tickets'
			);
			return response.data.data ?? [];
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const supportTicketService = new SupportTicketService();
