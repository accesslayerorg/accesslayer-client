import { format } from 'date-fns';
import type {
	VerificationApplication,
	VerificationApplicationDraft,
	VerificationStatus,
} from '@/services/creatorVerification.service';

export const VERIFICATION_STATUS_LABELS: Record<VerificationStatus, string> = {
	submitted: 'Submitted',
	in_review: 'In review',
	approved: 'Approved',
	rejected: 'Rejected',
};

export function getStatusLabel(status: VerificationStatus): string {
	return VERIFICATION_STATUS_LABELS[status];
}

export function formatVerificationTimestamp(iso: string): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return 'Unknown';
	return format(date, 'MMM d, yyyy · h:mm a');
}

function isValidSocialUrl(value: string): boolean {
	try {
		const url = new URL(value.trim());
		return url.protocol === 'https:' || url.protocol === 'http:';
	} catch {
		return false;
	}
}

export function validateVerificationDraft(
	draft: VerificationApplicationDraft
): Record<string, string> {
	const errors: Record<string, string> = {};
	if (draft.legalName.trim().length < 2) {
		errors.legalName = 'Enter your full legal name.';
	}
	if (draft.socialUrls.length === 0) {
		errors.socialUrls = 'Add at least one verified social account link.';
	} else if (draft.socialUrls.some(url => !isValidSocialUrl(url))) {
		errors.socialUrls = 'Every social link must be a full http(s) URL.';
	}
	if (draft.proofCode.trim().length < 6) {
		errors.proofCode = 'The proof code must be at least 6 characters.';
	}
	return errors;
}

export function createProofCode(): string {
	const random = Math.random().toString(36).slice(2, 10).toUpperCase();
	return `AL-${random}`;
}

export function draftFromApplication(
	application: VerificationApplication | null
): VerificationApplicationDraft {
	if (!application) {
		return { legalName: '', socialUrls: [''], proofCode: createProofCode() };
	}
	return {
		legalName: application.legalName,
		socialUrls: application.socialUrls.length ? [...application.socialUrls] : [''],
		proofCode: application.proofCode,
	};
}
