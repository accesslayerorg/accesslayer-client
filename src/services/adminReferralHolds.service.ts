import { BaseApiService, type APIResponse } from './api.service';

export type ReferralHoldStatus = 'held' | 'released' | 'rejected';

export type ReferralHoldReason = 'self-referral' | 'sybil-cluster';

export type ReferralHoldReviewAction = 'release' | 'reject';

export interface ReferralHold {
	id: string;
	referrer: string;
	referee: string;
	reason: ReferralHoldReason;
	clusterSize: number;
	amountXlm: number;
	status: ReferralHoldStatus;
	createdAt: string;
	reviewedAt?: string | null;
	reviewedBy?: string | null;
	reviewNote?: string | null;
}

export interface LinkedWallet {
	address: string;
	role: 'referrer' | 'referee' | 'cluster';
	joinedAt?: string | null;
	fundedBy?: string | null;
}

export interface FirstFundingTransaction {
	hash: string;
	from: string;
	to: string;
	amountXlm: number;
	timestamp: string;
}

export interface HoldTimelineEvent {
	id: string;
	label: string;
	timestamp: string;
	actor?: string | null;
	description?: string | null;
}

export interface ReferralHoldDetail extends ReferralHold {
	linkedWallets: LinkedWallet[];
	fundingTransactions: FirstFundingTransaction[];
	timeline: HoldTimelineEvent[];
}

export interface ReferralHoldFilters {
	status?: ReferralHoldStatus;
	reason?: ReferralHoldReason;
}

export interface ReferralHoldsPage {
	items: ReferralHold[];
	nextCursor: string | null;
}

export interface ReferralHoldsSummary {
	held: number;
	released: number;
	rejected: number;
	amountHeldXlm: number;
}

export interface ReviewReferralHoldInput {
	action: ReferralHoldReviewAction;
	note: string;
	reviewer?: string;
}

class AdminReferralHoldsService extends BaseApiService {
	async getHolds(
		filters: ReferralHoldFilters = {},
		cursor?: string | null
	): Promise<ReferralHoldsPage> {
		try {
			const params: Record<string, string> = {};
			if (filters.status) params.status = filters.status;
			if (filters.reason) params.reason = filters.reason;
			if (cursor) params.cursor = cursor;

			const response = await this.api.get<APIResponse<ReferralHoldsPage>>(
				'/admin/referral-holds',
				{ params }
			);
			const data = response.data.data;
			return {
				items: Array.isArray(data?.items) ? data.items : [],
				nextCursor: data?.nextCursor ?? null,
			};
		} catch (error) {
			throw this.handleError(error);
		}
	}

	async getSummary(): Promise<ReferralHoldsSummary> {
		try {
			const response = await this.api.get<APIResponse<ReferralHoldsSummary>>(
				'/admin/referral-holds/summary'
			);
			const data = response.data.data;
			return {
				held: data?.held ?? 0,
				released: data?.released ?? 0,
				rejected: data?.rejected ?? 0,
				amountHeldXlm: data?.amountHeldXlm ?? 0,
			};
		} catch (error) {
			throw this.handleError(error);
		}
	}

	async getHold(id: string): Promise<ReferralHoldDetail> {
		try {
			const response = await this.api.get<APIResponse<ReferralHoldDetail>>(
				`/admin/referral-holds/${encodeURIComponent(id)}`
			);
			const data = response.data.data;
			return {
				...data,
				linkedWallets: Array.isArray(data?.linkedWallets)
					? data.linkedWallets
					: [],
				fundingTransactions: Array.isArray(data?.fundingTransactions)
					? data.fundingTransactions
					: [],
				timeline: Array.isArray(data?.timeline) ? data.timeline : [],
			};
		} catch (error) {
			throw this.handleError(error);
		}
	}

	async reviewHold(
		id: string,
		input: ReviewReferralHoldInput
	): Promise<ReferralHold> {
		try {
			const response = await this.api.post<APIResponse<ReferralHold>>(
				`/admin/referral-holds/${encodeURIComponent(id)}/review`,
				input
			);
			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const adminReferralHoldsService = new AdminReferralHoldsService();

export async function fetchReferralHoldsPage(
	filters: ReferralHoldFilters,
	cursor: string | null | undefined
): Promise<ReferralHoldsPage> {
	return adminReferralHoldsService.getHolds(filters, cursor);
}

export async function fetchReferralHoldsSummary(): Promise<ReferralHoldsSummary> {
	return adminReferralHoldsService.getSummary();
}

export async function fetchReferralHoldDetail(
	id: string
): Promise<ReferralHoldDetail> {
	return adminReferralHoldsService.getHold(id);
}

export async function submitReferralHoldReview(
	id: string,
	input: ReviewReferralHoldInput
): Promise<ReferralHold> {
	return adminReferralHoldsService.reviewHold(id, input);
}
