import {
	SUPPORT_TICKET_ISSUE_TYPES,
	type SupportTicketIssueType,
} from '@/services/supportTicket.service';

export const SUPPORT_TICKET_DESCRIPTION_MAX_LENGTH = 2000;

/** Stellar transaction hashes are 64 lowercase hex characters. */
const TX_HASH_PATTERN = /^[0-9a-f]{64}$/i;

export interface SupportTicketDraftInput {
	issueType: SupportTicketIssueType | '';
	description: string;
	transactionHash: string;
}

/**
 * Validates a support ticket draft before submission (#1250). The
 * transaction hash field is optional — only validated for shape when the
 * holder actually provided one.
 */
export function validateSupportTicketDraft(
	draft: SupportTicketDraftInput
): string | null {
	if (
		!draft.issueType ||
		!SUPPORT_TICKET_ISSUE_TYPES.includes(draft.issueType)
	) {
		return 'Choose an issue type.';
	}
	if (!draft.description.trim()) {
		return 'Describe the issue.';
	}
	if (draft.description.length > SUPPORT_TICKET_DESCRIPTION_MAX_LENGTH) {
		return `Description must be ${SUPPORT_TICKET_DESCRIPTION_MAX_LENGTH} characters or fewer.`;
	}
	if (
		draft.transactionHash.trim() &&
		!TX_HASH_PATTERN.test(draft.transactionHash.trim())
	) {
		return 'Transaction hash must be 64 hex characters.';
	}
	return null;
}
