import { BaseApiService, type APIResponse } from './api.service';
import { submitCreatorContractCall } from '@/hooks/useCreatorContractActions';
import type { RevenueShareDistribution } from '@/types/revenueShare';

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
	return typeof value === 'object' && value !== null
		? (value as UnknownRecord)
		: {};
}

function asNumber(value: unknown, fallback = 0): number {
	const parsed = typeof value === 'number' ? value : Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
}

function asOptionalNumber(value: unknown): number | null {
	if (value == null || value === '') return null;
	const parsed = typeof value === 'number' ? value : Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

function firstString(...values: unknown[]): string | null {
	for (const value of values) {
		if (typeof value === 'string' && value.trim() !== '') return value.trim();
	}
	return null;
}

function normalizeTimestamp(value: unknown): number {
	if (typeof value === 'string' && value.trim() !== '') {
		const parsed = Date.parse(value);
		if (Number.isFinite(parsed)) return parsed;
	}

	const numeric = typeof value === 'number' ? value : Number(value);
	if (Number.isFinite(numeric)) {
		// Unix seconds are occasionally returned instead of milliseconds.
		return numeric < 1_000_000_000_000 ? numeric * 1000 : numeric;
	}

	return Date.now();
}

/**
 * Normalises a distribution payload into a {@link RevenueShareDistribution}.
 *
 * Returns null for entries without an id, which the contract call needs.
 */
export function normalizeRevenueShareDistribution(
	value: unknown,
	creatorId: string
): RevenueShareDistribution | null {
	const raw = asRecord(value);

	const id = firstString(raw.id, raw.distributionId, raw.distribution_id);
	if (!id) return null;

	const claimed =
		raw.claimed === true ||
		raw.claimed === 'true' ||
		raw.status === 'claimed' ||
		raw.status === 'claimed_at';

	const claimedAtRaw = raw.claimedAt ?? raw.claimed_at;

	return {
		id,
		creatorId: firstString(raw.creatorId, raw.creator_id) ?? creatorId,
		amount: Math.max(asNumber(raw.amount ?? raw.totalAmount ?? raw.total), 0),
		timestamp: normalizeTimestamp(
			raw.timestamp ?? raw.createdAt ?? raw.created_at ?? raw.distributedAt
		),
		holderCount: Math.max(
			asNumber(raw.holderCount ?? raw.holder_count ?? raw.holders),
			0
		),
		userShare: Math.max(
			asNumber(
				raw.userShare ??
					raw.user_share ??
					raw.share ??
					raw.estimatedAmount ??
					raw.myShare
			),
			0
		),
		claimed,
		receivedAmount: asOptionalNumber(
			raw.receivedAmount ?? raw.received_amount ?? raw.received ?? raw.claimedAmount
		),
		claimedAt:
			claimedAtRaw == null ? null : normalizeTimestampOrNull(claimedAtRaw),
	};
}

function normalizeTimestampOrNull(value: unknown): number | null {
	if (value == null || value === '') return null;
	const timestamp = normalizeTimestamp(value);
	return Number.isFinite(timestamp) ? timestamp : null;
}

class RevenueShareService extends BaseApiService {
	/**
	 * Revenue distributions a key holder can claim from:
	 * GET /keys/:keyId/revenue-distributions?wallet=...
	 *
	 * Each entry carries the distributed total and, when the server knows it,
	 * the holder's own pro-rata share and claim state.
	 */
	async getDistributions(
		keyId: string,
		wallet?: string
	): Promise<RevenueShareDistribution[]> {
		try {
			const response = await this.api.get<APIResponse<unknown>>(
				`/keys/${encodeURIComponent(keyId)}/revenue-distributions`,
				{ params: wallet ? { wallet } : undefined }
			);

			const payload = asRecord(response.data.data);
			const rows = Array.isArray(response.data.data)
				? response.data.data
				: Array.isArray(payload.distributions)
					? payload.distributions
					: Array.isArray(payload.data)
						? payload.data
						: [];

			return rows
				.map(row => normalizeRevenueShareDistribution(row, keyId))
				.filter(
					(entry): entry is RevenueShareDistribution => entry !== null
				)
				.sort((a, b) => b.timestamp - a.timestamp);
		} catch (error) {
			const apiError = this.handleError(error);
			// The endpoint may not be deployed yet; the distributions recorded
			// locally by the creator are used instead.
			if (apiError.status === 404) return [];
			throw apiError;
		}
	}
}

export const revenueShareService = new RevenueShareService();

/**
 * Convenience wrapper for fetching the claimable distributions of a key.
 */
export function fetchRevenueShareDistributions(
	keyId: string,
	wallet?: string
): Promise<RevenueShareDistribution[]> {
	return revenueShareService.getDistributions(keyId, wallet);
}

/**
 * Submits the `claim_revenue_share` contract call for one distribution.
 */
export async function claimRevenueShare(
	keyId: string,
	distributionId: string,
	wallet?: string
): Promise<{ success: true }> {
	return submitCreatorContractCall('claim_revenue_share', {
		creatorId: keyId,
		distributionId,
		wallet,
	});
}
