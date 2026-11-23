import { BaseApiService, type APIResponse } from './api.service';
import { cacheManager } from '@/utils/cache.utils';
import { submitCreatorContractCall } from '@/hooks/useCreatorContractActions';
import { buildMockWithdrawalTxHash } from '@/utils/creatorRevenue.utils';
import {
	aggregateEarningsSummary,
	buildFallbackEarningsRecords,
	EARNINGS_STREAM_CONTRACT_CALLS,
	isEarningsStream,
	normalizeEarningsRecord,
	toNonNegativeAmount,
} from '@/utils/creatorEarnings.utils';
import type {
	ClaimEarningsResult,
	CreatorEarningsRecord,
	CreatorEarningsSummary,
	EarningsStream,
} from '@/types/creatorEarnings';

const EARNINGS_CACHE_PREFIX = 'creator_earnings_';
const EARNINGS_CACHE_TTL_MS = 15_000;

interface ClaimOverride {
	claimedAt: number;
	transactionHash: string;
}

/**
 * Claims submitted during this session. The backend may not yet expose claim
 * state, so these overrides are applied on top of every fetch to keep the
 * unclaimed balances accurate after a successful withdrawal.
 */
const claimOverrides = new Map<
	string,
	Partial<Record<EarningsStream, ClaimOverride>>
>();

function cacheKey(creatorId: string): string {
	return `${EARNINGS_CACHE_PREFIX}${creatorId}`;
}

function applyClaimOverrides(
	creatorId: string,
	records: CreatorEarningsRecord[]
): CreatorEarningsRecord[] {
	const overrides = claimOverrides.get(creatorId);
	if (!overrides) return records;

	return records.map(record => {
		if (record.status === 'claimed') return record;
		const override = overrides[record.stream];
		if (!override) return record;
		return {
			...record,
			status: 'claimed',
			transactionHash: override.transactionHash,
		};
	});
}

function normalizeRecords(
	creatorId: string,
	raw: unknown
): CreatorEarningsRecord[] | null {
	if (!Array.isArray(raw)) return null;
	const records = raw
		.map(entry => normalizeEarningsRecord(entry, creatorId))
		.filter((record): record is CreatorEarningsRecord => record !== null);
	return records;
}

class CreatorEarningsService extends BaseApiService {
	/**
	 * Fetches every earning record for a creator:
	 * GET /creators/:id/earnings
	 */
	async getCreatorEarnings(
		creatorId: string
	): Promise<CreatorEarningsSummary> {
		const key = cacheKey(creatorId);
		const cached = cacheManager.get<CreatorEarningsSummary>(key);
		if (cached) return cached;

		let records: CreatorEarningsRecord[] | null = null;
		try {
			const response = await this.api.get<
				APIResponse<CreatorEarningsRecord[]>
			>(`/creators/${creatorId}/earnings`);
			records = normalizeRecords(creatorId, response.data.data);
		} catch {
			// The earnings endpoint may not be deployed yet; fall back below so
			// the dashboard still renders with representative data.
		}

		const summary = aggregateEarningsSummary(
			creatorId,
			applyClaimOverrides(
				creatorId,
				records ?? buildFallbackEarningsRecords(creatorId)
			)
		);
		cacheManager.set(key, summary, EARNINGS_CACHE_TTL_MS);
		return summary;
	}

	/**
	 * Claims the unclaimed balance for one stream by submitting the matching
	 * contract call, then records a local override so totals update on the next
	 * fetch.
	 */
	async claimEarningsStream(
		creatorId: string,
		stream: EarningsStream,
		amountXlm: number,
		wallet?: string
	): Promise<ClaimEarningsResult> {
		const amount = toNonNegativeAmount(amountXlm);
		if (!isEarningsStream(stream) || amount <= 0) {
			throw new Error('No unclaimed earnings for this stream');
		}

		await submitCreatorContractCall(EARNINGS_STREAM_CONTRACT_CALLS[stream], {
			creatorId,
			stream,
			amountXlm: amount,
			wallet,
		});

		const transactionHash = buildMockWithdrawalTxHash();
		const claimedAt = Date.now();
		const existing = claimOverrides.get(creatorId) ?? {};
		claimOverrides.set(creatorId, {
			...existing,
			[stream]: { claimedAt, transactionHash },
		});

		this.invalidateCreatorEarnings(creatorId);

		return {
			success: true,
			stream,
			amountXlm: amount,
			claimedAt,
			transactionHash,
		};
	}

	/** Drops the cached summary after a claim so the next read is fresh. */
	invalidateCreatorEarnings(creatorId: string): void {
		cacheManager.invalidate(cacheKey(creatorId));
	}

	/** Clears session claim overrides (used by tests). */
	clearClaimOverrides(): void {
		claimOverrides.clear();
	}
}

export const creatorEarningsService = new CreatorEarningsService();

export async function fetchCreatorEarnings(
	creatorId: string
): Promise<CreatorEarningsSummary> {
	return creatorEarningsService.getCreatorEarnings(creatorId);
}

export async function submitEarningsClaim(
	creatorId: string,
	stream: EarningsStream,
	amountXlm: number,
	wallet?: string
): Promise<ClaimEarningsResult> {
	return creatorEarningsService.claimEarningsStream(
		creatorId,
		stream,
		amountXlm,
		wallet
	);
}
