import { describe, expect, it } from 'vitest';
import {
	SUPPORT_TICKET_DESCRIPTION_MAX_LENGTH,
	validateSupportTicketDraft,
} from '@/utils/supportTicket.utils';

const validHash = 'a'.repeat(64);

describe('validateSupportTicketDraft (#1250)', () => {
	it('requires an issue type', () => {
		expect(
			validateSupportTicketDraft({
				issueType: '',
				description: 'something broke',
				transactionHash: '',
			})
		).toBe('Choose an issue type.');
	});

	it('rejects an issue type outside the known set', () => {
		expect(
			validateSupportTicketDraft({
				// @ts-expect-error — intentionally invalid for the test
				issueType: 'not_a_real_type',
				description: 'something broke',
				transactionHash: '',
			})
		).toBe('Choose an issue type.');
	});

	it('requires a non-empty description', () => {
		expect(
			validateSupportTicketDraft({
				issueType: 'other',
				description: '   ',
				transactionHash: '',
			})
		).toBe('Describe the issue.');
	});

	it('rejects a description over the max length', () => {
		expect(
			validateSupportTicketDraft({
				issueType: 'other',
				description: 'x'.repeat(SUPPORT_TICKET_DESCRIPTION_MAX_LENGTH + 1),
				transactionHash: '',
			})
		).toBe(
			`Description must be ${SUPPORT_TICKET_DESCRIPTION_MAX_LENGTH} characters or fewer.`
		);
	});

	it('allows an empty transaction hash', () => {
		expect(
			validateSupportTicketDraft({
				issueType: 'trading_frozen',
				description: 'cannot sell',
				transactionHash: '',
			})
		).toBeNull();
	});

	it('rejects a malformed transaction hash', () => {
		expect(
			validateSupportTicketDraft({
				issueType: 'trading_frozen',
				description: 'cannot sell',
				transactionHash: 'not-a-hash',
			})
		).toBe('Transaction hash must be 64 hex characters.');
	});

	it('accepts a valid 64-hex transaction hash', () => {
		expect(
			validateSupportTicketDraft({
				issueType: 'balance_dispute',
				description: 'balance looks wrong',
				transactionHash: validHash,
			})
		).toBeNull();
	});
});
