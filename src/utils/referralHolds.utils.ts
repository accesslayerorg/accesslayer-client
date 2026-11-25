import type {
	ReferralHoldFilters,
	ReferralHoldReason,
	ReferralHoldStatus,
} from '@/services/adminReferralHolds.service';

export const REFERRAL_HOLD_STATUSES: ReferralHoldStatus[] = [
	'held',
	'released',
	'rejected',
];

export const REFERRAL_HOLD_REASONS: ReferralHoldReason[] = [
	'self-referral',
	'sybil-cluster',
];

export const REFERRAL_HOLD_STATUS_LABELS: Record<ReferralHoldStatus, string> = {
	held: 'Held',
	released: 'Released',
	rejected: 'Rejected',
};

export const REFERRAL_HOLD_REASON_LABELS: Record<ReferralHoldReason, string> = {
	'self-referral': 'Self-referral',
	'sybil-cluster': 'Sybil cluster',
};

export function isReferralHoldStatus(
	value: string | null
): value is ReferralHoldStatus {
	return value === 'held' || value === 'released' || value === 'rejected';
}

export function isReferralHoldReason(
	value: string | null
): value is ReferralHoldReason {
	return value === 'self-referral' || value === 'sybil-cluster';
}

export function parseReferralHoldFilters(
	params: URLSearchParams
): ReferralHoldFilters {
	const status = params.get('status');
	const reason = params.get('reason');
	return {
		status: isReferralHoldStatus(status) ? status : undefined,
		reason: isReferralHoldReason(reason) ? reason : undefined,
	};
}
