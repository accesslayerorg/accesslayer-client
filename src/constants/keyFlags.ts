import type { KeyFlagReasonCode } from '@/services/course.service';

/** Selectable reasons for flagging a creator key (#1386). */
export const KEY_FLAG_REASONS: ReadonlyArray<{
	value: KeyFlagReasonCode;
	label: string;
}> = [
	{ value: 'spam', label: 'Spam or misleading promotion' },
	{ value: 'fraud', label: 'Fraud or scam activity' },
	{ value: 'impersonation', label: 'Impersonating someone else' },
	{ value: 'abuse', label: 'Abusive or harmful content' },
	{ value: 'other', label: 'Other policy violation' },
];

/** Human-readable label for a flag reason code, falling back to the raw code. */
export function getKeyFlagReasonLabel(code: string | null | undefined): string {
	if (!code) return 'Unknown reason';
	return KEY_FLAG_REASONS.find(reason => reason.value === code)?.label ?? code;
}

const REVIEW_STATUS_LABELS: Record<string, string> = {
	pending: 'Review pending',
	in_review: 'Review in progress',
	resolved: 'Review complete',
};

/** Human-readable label for the review status of a frozen key. */
export function formatKeyFlagReviewStatus(
	status: string | null | undefined
): string {
	if (!status) return 'Awaiting reviewer assignment';
	return REVIEW_STATUS_LABELS[status] ?? status;
}
