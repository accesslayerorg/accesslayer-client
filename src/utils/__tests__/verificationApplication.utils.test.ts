import { describe, expect, it } from 'vitest';
import type { VerificationApplication } from '@/services/creatorVerification.service';
import {
	draftFromApplication,
	formatVerificationTimestamp,
	validateVerificationDraft,
} from '@/utils/verificationApplication.utils';

describe('verification application utilities (#1410)', () => {
	it('blocks missing required fields with inline errors', () => {
		const errors = validateVerificationDraft({
			legalName: '',
			socialUrls: ['not-a-url'],
			proofCode: 'abc',
		});
		expect(errors.legalName).toBeTruthy();
		expect(errors.socialUrls).toBeTruthy();
		expect(errors.proofCode).toBeTruthy();

		expect(
			validateVerificationDraft({
				legalName: 'Ada Lovelace',
				socialUrls: ['https://x.com/ada'],
				proofCode: 'AL-ABC12345',
			})
		).toEqual({});
	});

	it('prefills a rejected application including its proof code', () => {
		const application = {
			id: 'app-1',
			status: 'rejected',
			legalName: 'Grace Hopper',
			socialUrls: ['https://x.com/grace'],
			proofCode: 'AL-RETRY99',
			proofVerified: false,
			reviewerNote: 'Add a clearer photo',
			submittedAt: '2026-06-01T00:00:00Z',
			updatedAt: '2026-06-02T00:00:00Z',
		} as VerificationApplication;

		expect(draftFromApplication(application)).toEqual({
			legalName: 'Grace Hopper',
			socialUrls: ['https://x.com/grace'],
			proofCode: 'AL-RETRY99',
		});
	});

	it('formats review timestamps', () => {
		expect(formatVerificationTimestamp('2026-06-01T00:00:00Z')).toMatch(/Jun 1, 2026/);
	});
});
